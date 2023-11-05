import { Helia } from "helia"
import { encBuffers, EncryptedBuffers } from "./heliaBuffer.js"
import { Crypter } from "@nabladelta/lambdadelta"
import { CID } from "multiformats/cid"
import { deserializePost, serializePost } from "./utils.js"
import { Key } from 'interface-datastore'
import type { Datastore } from 'interface-datastore'
import { Logger } from "tslog"
import { TYPE_POST, TYPE_THREAD } from "./bernkastel.js"

export type ContentManagerConstructorOptions = {
    ipfs: Helia
    encryption: Crypter,
    store: Datastore,
    log: Logger<unknown>,
    maxAttachmentSize?: number,
    maxPostSize?: number
}

export enum PostVerificationResult {
    OK = "OK",
    TOO_LARGE = "TOO_LARGE",
    CONTENT_UNAVAILABLE = "CONTENT_UNAVAILABLE",
    DESERIALIZATION_ERROR = "DESERIALIZATION_ERROR",
    INVALID = "INVALID"
}

export enum AttachmentVerificationResult {
    OK = "OK",
    TOO_LARGE = "ATTACHMENT_TOO_LARGE",
    CONTENT_UNAVAILABLE = "ATTACHMENT_UNAVAILABLE",
    DESERIALIZATION_ERROR = "DESERIALIZATION_ERROR",
    INVALID = "INVALID"
}

/**
 * Handles the storage and retrieval of posts and attachments through IPFS and tracks references to them in a datastore
 */
export class ContentManager {
    private ipfs: Helia
    private ipfsBuffers: EncryptedBuffers
    private maxPostSize: number = 8192 // 8 KB
    private maxAttachmentSize: number = 1024 * 1024 * 10 // 10 MB
    private store: Datastore
    private log: Logger<unknown>

    constructor({ipfs, encryption, store, log, maxAttachmentSize, maxPostSize}: ContentManagerConstructorOptions) {
        this.ipfs = ipfs
        this.ipfsBuffers = encBuffers(ipfs, encryption)
        this.maxAttachmentSize = maxAttachmentSize || this.maxAttachmentSize
        this.maxPostSize = maxPostSize || this.maxPostSize
        this.store = store
        this.log = log
    }

    public async postReceived(eventID: string, payloadCID: string) {
        let cid: CID
        let buf: Uint8Array
        try {
            cid = CID.parse(payloadCID)
            buf = await this.ipfsBuffers.get(cid)
        } catch (e) {
            this.log.error(`Failed to fetch post content for ${eventID}: ${e}`)
            return { post: PostVerificationResult.CONTENT_UNAVAILABLE }
        }
        if (buf.length > this.maxPostSize) {
            this.log.error(`Post size for ${eventID} exceeds maximum size of ${this.maxPostSize} bytes`)
            return { post: PostVerificationResult.TOO_LARGE }
        }
        let post: IPost
        try {
            post = deserializePost(buf)
        } catch (e) {
            this.log.error(`Failed to deserialize post for ${eventID}: ${e}`)
            return { post:  PostVerificationResult.DESERIALIZATION_ERROR }
        }
        let attachmentResult: AttachmentVerificationResult | undefined
        if (post.tim) {
            attachmentResult = await this.attachmentReceived(eventID, post.tim)
        }
        const stringBuffer = new TextEncoder().encode('true')
        try {
            await this.store.put(new Key(`/posts/${eventID}/${payloadCID}`), stringBuffer)
            await this.store.put(new Key(`/cid/${payloadCID}/${eventID}`), stringBuffer)
            await this.pin(cid)
        } catch (e) {
            this.log.error(`Failed to store post for ${eventID}: ${e}`)
        }

        return {post: PostVerificationResult.OK, attachment: attachmentResult}
    }

    private async attachmentReceived(eventID: string, attachmentCIDString: string): Promise<AttachmentVerificationResult> {
        let attachment: Uint8Array | undefined
        let attachmentCID: CID
        try {
            attachmentCID = CID.parse(attachmentCIDString)
            attachment = await this.ipfsBuffers.get(attachmentCID)
        } catch (e) {
            this.log.error(`Failed to fetch attachment for ${eventID}: ${e}`)
            return AttachmentVerificationResult.CONTENT_UNAVAILABLE
        }
        if (attachment.length > this.maxAttachmentSize) {
            this.log.error(`Attachment size for ${eventID} exceeds maximum size of ${this.maxAttachmentSize} bytes`)
            return AttachmentVerificationResult.TOO_LARGE
        }
        const stringBuffer = new TextEncoder().encode('true')
        await this.store.put(new Key(`/posts/${eventID}/${attachmentCIDString}`), stringBuffer)
        await this.store.put(new Key(`/cid/${attachmentCIDString}/${eventID}`), stringBuffer)
        await this.pin(attachmentCID)
        return AttachmentVerificationResult.OK
    }

    public async postDeleted(eventID: string): Promise<void> {
        await this.deleteAttachments(eventID)
    }

    /**
     * Deletes all attachments/content that are not referenced by any other post
     * @param eventID
    */
    private async deleteAttachments(eventID: string) {
        const attachmentKeys = this.store.query({
            prefix: `/posts/${eventID}/`
        })
        for await (const key of attachmentKeys) {
            const cidString = key.toString().split('/')[3]
            const cid = CID.parse(cidString)
            const postsForAttachment = this.store.query({
                prefix: `/cid/${cidString}/`
            })
            let count = 0
            for await (const _postKey of postsForAttachment) {
                count++
                if (count > 1) {
                    break
                }
            }
            if (count > 1) {
                // This attachment is referenced by other posts, don't delete it
                await this.store.delete(new Key(`/cid/${cidString}/${eventID}`))
                await this.store.delete(new Key(`/posts/${eventID}/${cidString}`))
                continue
            }
            try {
                // Remove all references to this attachment
                await this.ipfs.pins.rm(cid)
                await this.store.delete(new Key(`/cid/${cidString}/${eventID}`))
                await this.store.delete(new Key(`/posts/${eventID}/${cidString}`))
            } catch (e) {
                this.log.warn(`Failed to unpin attachment ${cidString} for ${eventID}: ${e}`)
            }
        }
    }

    public async getPost(payloadCID: string): Promise<IPost | null> {
        try {
            const cid = CID.parse(payloadCID)
            if (!(await this.ipfs.pins.isPinned(cid))) {
                this.log.warn(`Post ${payloadCID} is not pinned`)
                const { post } = await this.postReceived(payloadCID, payloadCID)

                if (post !== PostVerificationResult.OK) {
                    this.log.error(`Failed to fetch post ${payloadCID}`)
                    return null
                }
            }
            const buf = await this.ipfsBuffers.get(cid)
            return deserializePost(buf)
        } catch (e) { 
            this.log.error(`Failed to retrieve/deserialize post ${payloadCID}: ${e}`)
            return null
        }
    }

    public async pin(cid: CID) {
        if (await this.ipfs.pins.isPinned(cid)) {
            return
        }
        this.ipfs.pins.add(cid)
    }

    public async addPost(post: IPost): Promise<string> {
        const cid = await this.ipfsBuffers.add(serializePost(post))
        return cid.toString()
    }

    public async getAttachment(cidString: string): Promise<Uint8Array> {
        const cid = CID.parse(cidString)
        const buf = await this.ipfsBuffers.get(cid)
        return buf
    }

    public async saveAttachment(attachment: Uint8Array): Promise<string> {
        const cid = await this.ipfsBuffers.add(attachment)
        return cid.toString()
    }
}