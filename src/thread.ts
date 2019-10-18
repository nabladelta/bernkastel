import IPFS from "ipfs";
import OrbitDB from "orbit-db"
import { FeedStore } from "orbit-db-feedstore"
import { Hash } from "crypto"

export class Thread {
    public ipfs: IPFS
    public orbit: OrbitDB
    public db: FeedStore<Post>
    public ready: Promise<void>
    constructor(ipfs: IPFS, orbit: OrbitDB, address?: string){
        this.ipfs = ipfs
        this.orbit = orbit
        this.ready = new Promise(async (resolve, reject) => {
            try {
                if (address == undefined){
                    this.db = await this.orbit.create(Date.now().toString(), 'feed', {}) as FeedStore<Post>
                } else {
                    this.db = await this.orbit.open(address) as FeedStore<Post>
                }
                this.db.events.on('replicated', this.replicated)
            } catch {
                reject()
            }
            resolve()
        })
    }
    async post(post: Post){
        const hash = await this.db.add(post)
        return hash
    }
    async read(options?: {
        gt?: string;
        gte?: string;
        lt?: string;
        lte?: string;
        limit?: number;
        reverse?: boolean;
    }){
        const posts = this.db.iterator(options).collect()
        return posts
    }
    async replicated(_address: string){ // fired whenever we receive new posts from other peers
        //TODO: find new entries
    }
}