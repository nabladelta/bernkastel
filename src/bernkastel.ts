import { EventRelayer, LambdadeltaFeed, LambdadeltaFeedConstructorOptions, LambdadeltaOptions, LambdadeltaSync, NullifierSpec, createLibp2p } from "@nabladelta/lambdadelta"
import { Lambdadelta } from "@nabladelta/lambdadelta"
import { BulletinBoard } from "./board.js"
import { ContentManager } from "./content.js"
import { Helia } from "helia"
import { createHelia } from "helia"

import { MemoryDatastore, NamespaceDatastore } from "datastore-core"
import { Blockstore } from "interface-blockstore"
import { MemoryBlockstore } from "blockstore-core"
import { LambdadeltaConstructorOptions } from "@nabladelta/lambdadelta"
import { VerificationResult } from "@nabladelta/rln"
import type { HeaderVerificationError } from "@nabladelta/lambdadelta"
import { Key } from 'interface-datastore'
export const TYPE_THREAD = "THREAD"
export const TYPE_POST = "POST"

export interface BernkastelOptions extends LambdadeltaOptions {
    ipfs: Helia
    maxThreads?: number
    blockstore?: Blockstore
}

export interface BernkastelConstructorOptions extends LambdadeltaConstructorOptions<BulletinBoard> {
    ipfs: Helia
}

export class Bernkastel extends Lambdadelta<BulletinBoard> {
    private get contentManager() {
        return this.feed.contentManager
    }

    public static get storePrefix() {
        return {
                ...super.storePrefix,
                contentManager: `${super.storePrefix.base}/contentManager`
        } as const
    }

    public get prefix() {
        return {
            ...super.prefix,
            contentManager: `${Bernkastel.storePrefix.base}${this.topicHash}/contentManager`
        }
    }

    protected constructor(args: BernkastelConstructorOptions) {
        super(args)
        const store = new NamespaceDatastore(this.store, new Key(this.prefix.contentManager))
        this.feed.setContentManager(new ContentManager({ipfs: args.ipfs, log: this.getSubLogger({'name': "IPFS"}), store, encryption: this.encryption}))
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
            store,
            logger,
            initialSyncPeriodMs,
            ipfs,
            libp2p,
            maxThreads,
            blockstore
        }: BernkastelOptions,
    ): Promise<Bernkastel> {
        store = store ?? new MemoryDatastore()
        blockstore = blockstore ?? new MemoryBlockstore()
        libp2p = libp2p || ipfs.libp2p as any ||  await createLibp2p(store)
        ipfs = await createHelia({blockstore, libp2p: libp2p as any})
        const lambdadelta = new Bernkastel({
            ipfs,
            topic,
            groupID,
            rln,
            store,
            libp2p: libp2p as any,
            feed: (args) => BulletinBoard.create({...args, maxThreads}),
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