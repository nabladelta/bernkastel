import { EventRelayer, LambdadeltaFeed, LambdadeltaOptions, LambdadeltaSync, NullifierSpec, createLibp2p } from "@nabladelta/lambdadelta"
import { Lambdadelta } from "@nabladelta/lambdadelta"
import { BulletinBoard } from "./board"
import { serializePost } from "./utils"
import { ContentManager } from "./content"
import { Helia } from "helia"
import { createHelia } from "helia"
export const TYPE_THREAD = "THREAD"
export const TYPE_POST = "POST"
import { MemoryDatastore } from "datastore-core"
import { MemoryBlockstore } from "blockstore-core"
import { LambdadeltaConstructorOptions } from "@nabladelta/lambdadelta"

export interface BernkastelOptions extends LambdadeltaOptions {
    ipfs: Helia
}

export class Bernkastel extends Lambdadelta<BulletinBoard> {
    private contentManager: ContentManager

    protected constructor(args: LambdadeltaConstructorOptions<BulletinBoard> & { ipfs: Helia }) {
        super(args)
        this.contentManager = new ContentManager(args.ipfs, this.encryption)
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
        const contentManager = new ContentManager(ipfs)
        const lambdadelta = new Bernkastel({ ipfs, topic, groupID, rln, store, libp2p, feed: (args) => BulletinBoard.create({...args, contentManager }), sync: (...args) => LambdadeltaSync.create(...args), relayer: EventRelayer.create, logger, initialSyncPeriodMs: initialSyncPeriodMs || 0})
        await lambdadelta.start()
        return lambdadelta
    }

    private async newMessage(type: typeof TYPE_THREAD | typeof TYPE_POST, post: IPost, attachment?: Uint8Array) {
        const payloadCID = await this.contentManager.addPost(post)
        return await this.newEvent(type, payloadCID)
    }

    public async newThread(post: IPost, attachment?: Uint8Array) {
        return await this.newMessage(TYPE_THREAD, post, attachment)
    }

    public async newPost(post: IPost, attachment?: Uint8Array) {
        return await this.newMessage(TYPE_POST, post, attachment)
    }

    public getPostByID = this.feed.getPostByID.bind(this.feed)

    public getThreadContent = this.feed.getThreadContent.bind(this.feed)

    public getCatalog = this.feed.getCatalog.bind(this.feed)

    public getThreadLength = this.feed.getThreadLength.bind(this.feed)

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