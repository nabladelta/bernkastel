import { Lambdadelta, Timeline }  from "@nabladelta/lambdadelta"
import { NullifierSpec } from "@nabladelta/lambdadelta"
import { deserializePost, serializePost } from "./utils"
import { RLN, RLNGFullProof, VerificationResult, nullifierInput } from '@nabladelta/rln'
import { FeedEventHeader, PeerData } from "@nabladelta/lambdadelta/src/lambdadelta"
import crypto from 'crypto'

const TYPE_THREAD = "THREAD"
const TYPE_POST = "POST"
const MAX_THREADS = 256
const MAX_ATTACHMENT_SIZE = 5400000

export class BulletinBoard extends Lambdadelta {
    private threads: Map<string, Timeline> = new Map()
    private lastModified: Timeline = new Timeline()
    private attachmentsToPosts: Map<string, Set<string>> = new Map()

    constructor(topic: string, corestore: any, rln: RLN) {
        super(topic, corestore, rln)
    }

    protected async validateContent(eventID: string, eventType: string, buf: Buffer): Promise<boolean> {
        try {
            const post = deserializePost(buf)
            if (eventType == TYPE_POST) {
                if (!post.resto || post.resto.length == 0) {
                    return false
                }
            }
            const originalHash = crypto.createHash('sha256').update(buf).digest('hex')
            const reSerialized = serializePost(post)
            const reHash = crypto.createHash('sha256').update(reSerialized).digest('hex')
            // Post MUST be the same after re-serialization
            // Otherwise, it means that the post has extraneous data in it
            if (originalHash !== reHash) {
                return false
            }

        } catch (e) {
            return false
        }
        return true
    }

    protected registerTypes(): void {
        const singlePost: NullifierSpec = {
            epoch: 10, // 10 Seconds per epoch
            messageLimit: 1 // 1 Message per epoch
        }
        const dailyPosts: NullifierSpec = {
            epoch: 86400, // 1 hour per epoch
            messageLimit: 2048 // 2048 messages per epoch
        }
        this.addEventType(TYPE_POST, [singlePost, dailyPosts], 4096)

        const singleThread: NullifierSpec = {
            epoch: 1000, // 1000 seconds per epoch
            messageLimit: 1 // 1 thread per epoch
        }
        const dailyThreads: NullifierSpec = {
            epoch: 86400, // 1 hour per epoch
            messageLimit: 16 // 16 threads per epoch
        }
        this.addEventType(TYPE_THREAD, [singleThread, dailyThreads], 4096)
    }

    private isEventOnBoard(eventID: string) {
        if (this.lastModified.getTime(eventID) !== undefined) {
            return true
        }
        for (let timeline of this.threads.values()) {
            if (timeline.getTime(eventID) !== undefined) {
                return true
            }
        }
        return false
    }

    protected async markEventsForDeletion() {
        const eventsToDelete = new Set<string>()
        for (const eventID of this.getAllEventIDs()) {
            if (!this.isEventOnBoard(eventID)) {
                eventsToDelete.add(eventID)
                await this.onEventGarbageCollected(eventID)
            }
        }
        return eventsToDelete
    }

    protected async deleteEventResources(eventID: string): Promise<void> {
        const event = await this.getEventByID(eventID)
        if (!event) {
            return
        }
        const post = deserializePost(event.payload)
        if (post.tim) {
            await this.deleteAttachment(post.tim, eventID)
        }
        await super.deleteEventResources(eventID)
    }

    private async deleteAttachment(attachmentHash: string, eventID: string) {
        const postsSet = this.attachmentsToPosts.get(attachmentHash) || new Set()
        postsSet.delete(eventID)
        if (postsSet.size == 0) {
            this.attachmentsToPosts.delete(attachmentHash)
            await this.drive.del(`/attachments/${attachmentHash}`)
            await this.drive.clear(`/attachments/${attachmentHash}`)
        }
    }

    protected async onTimelineRemove(eventID: string, time: number, consensusTime: number): Promise<void> {
        await super.onTimelineRemove(eventID, time, consensusTime)
        const event = await this.getEventByID(eventID)
        if (!event) {
            return
        }
        const post = deserializePost(event.payload)
        let threadId = event.header.eventType == TYPE_POST ? post.resto! : eventID
        this.removeEventFromThread(threadId, eventID)
    }

    protected async onEventSyncComplete(peer: PeerData, eventID: string): Promise<void> {
        const {header, payload} = await this.getEventByID(eventID) || {}
        if (payload) await this.syncAttachment(peer, deserializePost(payload).tim)
        await super.onEventSyncComplete(peer, eventID)
    }

    protected async onNewEvent(eventID: string, event: {header: FeedEventHeader, payload: Buffer}): Promise<void> {
        super.onNewEvent(eventID, event)
        const post = deserializePost(event.payload)
        // Save association between attachment and post
        if (post.tim) {
            const attachmentHash = post.tim
            const postsSet = this.attachmentsToPosts.get(attachmentHash) || new Set()
            postsSet.add(eventID)
            this.attachmentsToPosts.set(attachmentHash, postsSet)
        }
        switch (event.header.eventType) {
            case TYPE_THREAD:
                this.recvThread(eventID, event.header, post)
                break
            case TYPE_POST:
                this.recvPost(eventID, event.header, post)
                break
        }
    }

    private async syncAttachment(peer: PeerData, attachmentHash?: string) {
        if (!attachmentHash) return false // No attachments
        const ownEntry = await this.drive.entry(`/attachments/${attachmentHash}`)
        if (ownEntry) {
            return true  // We already have it
        }
        const entry = await peer.drive.entry(`/attachments/${attachmentHash}`)
        if (!entry) {
            return false  // Peer does not have attachment
        }
        if (entry.value.blob.byteLength > MAX_ATTACHMENT_SIZE!) {
            return false // Attachment too big
        }
        const payloadBuf: Buffer | null = await peer.drive.get(`/attachments/${attachmentHash}`)
        if (!payloadBuf) {
            return false
        }
        const hash = crypto.createHash('sha256').update(payloadBuf).digest('hex')
        if (hash !== attachmentHash) {
            return false // Attachment wrong hash
        }
        await this.drive.put(`/attachments/${attachmentHash}`, payloadBuf)
        return true
    }

    private recvThread(eventID: string, header: FeedEventHeader, payload: IPost) {
        this.addEventToThread(eventID, eventID, header.claimed)
    }

    private recvPost(eventID: string, header: FeedEventHeader, payload: IPost) {
        this.addEventToThread(payload.resto!, eventID, header.claimed)
    }

    private addEventToThread(threadID: string, eventID: string, time: number) {
        const timeline = this.threads.get(threadID) || new Timeline()
        timeline.setTime(eventID, time)
        this.threads.set(threadID, timeline)
        this.updateThreadBump(threadID)
    }

    private removeEventFromThread(threadID: string, eventID: string) {
        const timeline = this.threads.get(threadID)
        if (!timeline) {
            return
        }
        timeline.unsetTime(eventID)
        // Whole thread is being deleted
        if (threadID == eventID) {
            this.removeThread(threadID)
        }
    }

    private updateThreadBump(threadID: string) {
        const timeline = this.threads.get(threadID)
        if (!timeline) {
            throw new Error("Bumping inexistent thread")
        }
        const [time, _] = timeline.getMostRecent()
        if (!time) return
        this.lastModified.setTime(threadID, time)
        this.bumpOff()
    }

    /**
     * Bumps an expired thread off the board when there are too many
     */
    private bumpOff() {
        while (this.lastModified.getSize() > MAX_THREADS) {
            // Get lowest thread in bump order
            const [time, threadID] = this.lastModified.getLeastRecent()
            if (!time || !threadID) return
            this.removeThread(threadID)
        }
    }

    private removeThread(threadID: string) {
        this.lastModified.unsetTime(threadID)
        this.threads.delete(threadID)
    }

    public async newThread(op: IPost) {
        const { result, eventID } = await this.newEvent(TYPE_THREAD, serializePost(op))
        if (result !== VerificationResult.VALID) {
            return false
        }
        return eventID
    }

    public async newPost(post: IPost) {
        const { result, eventID } = await this.newEvent(TYPE_POST, serializePost(post))
        if (result !== VerificationResult.VALID) {
            return false
        }
        return eventID
    }

    public async saveAttachment(attachment: Buffer) {
        if (attachment.length > MAX_ATTACHMENT_SIZE) {
            throw new Error("Attachment too large")
        }
        const attachmentHash = crypto.createHash('sha256').update(attachment).digest('hex')
        await this.drive.put(`/attachments/${attachmentHash}`, attachment)
    }

    public async retrieveAttachment(attachmentHash: string) {
        const payloadBuf: Buffer | null = await this.drive.get(`/attachments/${attachmentHash}`)
        if (!payloadBuf) {
            return false
        }
        return payloadBuf
    }

    public async getPostByID(eventID: string) {
        const event = await this.getEventByID(eventID)
        if (!event) return undefined
        const payload = deserializePost(event.payload)
        payload.id = eventID
        payload.no = eventID.slice(0, 16)
        return payload
    }

    public async getThreadContent(threadID: string) {
        const timeline = this.threads.get(threadID)
        if (!timeline) return undefined
        if (timeline.getSize() < 1) return undefined

        const events = timeline.getEvents()
        const replies = timeline.getSize() - 1
        let images = 0
        let op
        const thread: IThread = {posts: []}
        for (const [_, eventID] of events) {
            const post = await this.getPostByID(eventID)
            if (!post) continue
            if (post.tim) images++
            if (eventID === threadID) {
                op = post
                continue
            }
            thread.posts.push(post)
        }
        if (!op) return undefined

        thread.posts.unshift(op)
        thread.posts[0].replies = replies
        thread.posts[0].images = images
        return thread
    }

    public async getCatalog() {
        const catalog: {page: number, threads: IPost[]}[] = []
        const threads = []
        // Iterate from newest to oldest
        for (let [lastModified, threadId] of this.lastModified.entriesReversed()) {
            const thread = (await this.getThreadContent(threadId))
            if (!thread) continue
            const op = thread.posts[0]
            op.last_replies = thread.posts.slice(1).slice(-3)
            op.last_modified = lastModified
            threads.push(op)
        }

        for (let i = 0; i <= 16; i++)  {
            const page = {
                page: i+1,
                threads: threads.slice(i*16, (i*16)+16)
            }
            if (page.threads.length == 0) {
                break
            }
            catalog.push(page)
        }
        return catalog
    }

    public getThreadLength(threadId: string) {
        return this.threads.get(threadId)?.getSize()
    }
}