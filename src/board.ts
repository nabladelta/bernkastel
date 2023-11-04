import { FeedEventHeader, LambdadeltaFeed, LambdadeltaFeedConstructorOptions, Timeline }  from "@nabladelta/lambdadelta"
import { deserializePost, } from "./utils.js"
import { TYPE_POST, TYPE_THREAD } from "./bernkastel.js"
import { ContentManager } from "./content.js"


const MAX_THREADS = 256
const MAX_ATTACHMENT_SIZE = 5400000

export class BulletinBoard extends LambdadeltaFeed {
    /**
     * Maps thread IDs to the timeline of the thread
     */
    private threads: Map<string, Timeline> = new Map()
    /**
     * Maps thread IDs to the last time the thread was modified
     */
    private lastModified: Timeline = new Timeline()
    /**
     * Content manager for the board
     */
    private contentManager: ContentManager
    /**
     * Maps post IDs to the thread IDs
     */
    private postIdsToThreadIds: Map<string, string> = new Map()

    constructor(args: LambdadeltaFeedConstructorOptions & {contentManager: ContentManager}) {
        super(args)
        this.contentManager = args.contentManager
    }

    public static create(args: LambdadeltaFeedConstructorOptions & {contentManager: ContentManager}) {
        const feed = new BulletinBoard({...args})
        return feed
    }

    protected async onTimelineRemove(eventID: string, time: number): Promise<void> {
        const event = await this.getEventByID(eventID)
        if (!event) {
            return
        }
        
        this.removeEventFromThread(eventID)
    }

    protected async onEventHeaderSync(eventID: string, header: FeedEventHeader): Promise<void> {
        await this.contentManager.getPost(header.payloadHash)
    }

    protected async onTimelineAdd(eventID: string, time: number): Promise<void> {
        const event = await this.getEventByID(eventID)
        if (!event) {
            return
        }
        const post = await this.contentManager.getPost(event.header.payloadHash)
        
        switch (event.header.eventType) {
            case TYPE_THREAD:
                this.addEventToThread(eventID, eventID, event.header.claimed)
                break
            case TYPE_POST:
                this.addEventToThread(post.resto!, eventID, event.header.claimed)
                break
        }
    }

    protected async onEventDeleted(eventID: string): Promise<void> {
        const event = await this.getEventByID(eventID)
        if (!event) {
            return
        }
        await this.contentManager.removePost(event.header.payloadHash)
        this.removeEventFromThread(eventID)
    }

    private addEventToThread(threadID: string, eventID: string, time: number) {
        const timeline = this.threads.get(threadID) || new Timeline()
        timeline.setTime(eventID, time)
        this.threads.set(threadID, timeline)
        this.postIdsToThreadIds.set(eventID, threadID)
        this.updateThreadBump(threadID)
    }

    private removeEventFromThread(eventID: string): boolean {
        const threadID = this.postIdsToThreadIds.get(eventID)
        if (!threadID) {
            return false
        }
        const timeline = this.threads.get(threadID)
        if (!timeline) {
            return false
        }
        timeline.unsetTime(eventID)
        // Whole thread is being deleted
        if (threadID == eventID) {
            this.removeThread(threadID)
        }
        this.postIdsToThreadIds.delete(eventID)
        this.updateThreadBump(threadID)
        return true
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
        this.scheduleEventDeletion(threadID)
    }

    private getThreadId(eventID: string): string | false {
        if (this.lastModified.getTime(eventID) !== undefined) {
            return eventID
        }
        for (let [threadID, timeline] of this.threads) {
            if (timeline.getTime(eventID) !== undefined) {
                return threadID
            }
        }
        return false
    }

    public async getPostByID(eventID: string) {
        const event = await this.getEventByID(eventID)
        if (!event) return undefined
        const payload = deserializePost(Buffer.from(event.header.payloadHash))
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