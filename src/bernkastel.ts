import { EventRelayer, LambdadeltaFeed, LambdadeltaFeedConstructorOptions, LambdadeltaOptions, LambdadeltaSync, NullifierSpec, createLibp2p } from "@nabladelta/lambdadelta"
import { Lambdadelta } from "@nabladelta/lambdadelta"
import { BulletinBoard } from "./board.js"
import { ContentManager } from "./content.js"
import { Helia } from "helia"
import { createHelia } from "helia"
export const TYPE_THREAD = "THREAD"
export const TYPE_POST = "POST"
import { MemoryDatastore } from "datastore-core"
import { MemoryBlockstore } from "blockstore-core"
import { LambdadeltaConstructorOptions } from "@nabladelta/lambdadelta"
import { VerificationResult } from "@nabladelta/rln"
import { HeaderVerificationError } from "@nabladelta/lambdadelta/src/verifyEventHeader"

export interface BernkastelOptions extends LambdadeltaOptions {
    ipfs: Helia
}

export interface BernkastelConstructorOptions extends LambdadeltaConstructorOptions<LambdadeltaFeed> {
    ipfs: Helia
    contentManager: ContentManager
}

export class Bernkastel extends Lambdadelta<BulletinBoard> {
    private get contentManager() {
        return this.feed.contentManager
    }

    protected constructor(args: LambdadeltaConstructorOptions<BulletinBoard> & { 
        ipfs: Helia,
    }) {
        super(args)
        this.feed.setContentManager(new ContentManager(args.ipfs, this.encryption))
    }

    /**
     * Creates a new Lambdadelta instance with the provided options.
     *
     * @param {LambdadeltaOptions} options - Configuration options for the Lambdadelta instance.
     * @param components Custom components for feed, sync, and relayer
     * @returns {Promise<Lambdadelta>} Returns a new Lambdadelta instance.
     */
    public static async create(
        {
            topic,
            groupID,
            rln,
            libp2p,
            store,
            logger,
            initialSyncPeriodMs,
        }: LambdadeltaOptions,
    ): Promise<Bernkastel> {
        store = store || new MemoryDatastore()
        libp2p = libp2p || await createLibp2p(store)
        const blockstore = new MemoryBlockstore()
        const ipfs = await createHelia({libp2p, datastore: store, blockstore, start: true})
        const lambdadelta = new Bernkastel({ ipfs, topic, groupID, rln, store, libp2p, 
            feed: BulletinBoard.create,
            sync: LambdadeltaSync.create,
            relayer: EventRelayer.create,
            logger,
            initialSyncPeriodMs: initialSyncPeriodMs || 0})
        await lambdadelta.start()
        return lambdadelta
    }

    private async newMessage(type: typeof TYPE_THREAD | typeof TYPE_POST, post: IPost, attachment?: Uint8Array) {
        if (attachment) {
            const attachmentCID = await this.contentManager.saveAttachment(attachment)
            post.tim = attachmentCID
        }
        const payloadCID = await this.contentManager.addPost(post)
        return await this.newEvent(type, payloadCID)
    }

    public async newThread(post: IPost, attachment?: Uint8Array): Promise<{result: boolean | VerificationResult | HeaderVerificationError, eventID: string, exists: boolean}> {
        return await this.newMessage(TYPE_THREAD, post, attachment)
    }

    public async newPost(post: IPost, attachment?: Uint8Array): Promise<{result: boolean | VerificationResult | HeaderVerificationError, eventID: string, exists: boolean}> {
        return await this.newMessage(TYPE_POST, post, attachment)
    }

    public getPostByID = this.feed.getPostByID.bind(this.feed)

    public getThreadContent = this.feed.getThreadContent.bind(this.feed)

    public getCatalog = this.feed.getCatalog.bind(this.feed)

    public getThreadLength = this.feed.getThreadLength.bind(this.feed)

    public getAttachment = (cid: string) => this.contentManager.getAttachment(cid)

    protected registerTypes(): void {
        const singlePost: NullifierSpec = {
            epoch: 10, // 10 Seconds per epoch
            messageLimit: 1 // 1 Message per epoch
        }
        const dailyPosts: NullifierSpec = {
            epoch: 86400, // 1 hour per epoch
            messageLimit: 2048 // 2048 messages per epoch
        }
        this.addEventType(TYPE_POST, [singlePost, dailyPosts])

        const singleThread: NullifierSpec = {
            epoch: 1000, // 1000 seconds per epoch
            messageLimit: 1 // 1 thread per epoch
        }
        const dailyThreads: NullifierSpec = {
            epoch: 86400, // 1 hour per epoch
            messageLimit: 16 // 16 threads per epoch
        }
        this.addEventType(TYPE_THREAD, [singleThread, dailyThreads])
    }
}