import IPFS from "ipfs";
import OrbitDB from "orbit-db"
import ThreadStore from './ThreadStore'
import {Post} from './Post'
interface IThreadOptions {
    moderators?: Set<string>
}
class Thread {
    public ipfs: IPFS
    public orbit: OrbitDB
    public db: ThreadStore
    public ready: Promise<void> // resolves when the thread is ready
    public moderators: Set<string> // public keys of moderators
    constructor(ipfs: IPFS, orbit: OrbitDB, address?: string, options?: IThreadOptions){
        this.ipfs = ipfs
        this.orbit = orbit
        this.setOptions(options)
        this.ready = new Promise(async (resolve, reject) => {
            try {
                if (address == undefined){
                    this.db = await this.orbit.create(Date.now().toString(), 'feed', {write: ["*"]}) as ThreadStore
                } else {
                    this.db = await this.orbit.open(address) as ThreadStore
                }
                //this.db.setIdentity()
                this.db.events.on('replicated', this.replicated)
            } catch {
                reject()
            }
            resolve()
        })
    }
    setOptions(options: IThreadOptions){
        this.moderators = options.moderators

    }
    get posts(){
        return this.db.all.map((entry) => {
            if (entry.payload.value.deletedBy == undefined) return entry // no one has deleted this entry

            if (entry.payload.value.deletedBy.has(entry.identity.publicKey)){ // deleted by the original creator
                entry.payload.value.hide = true
                return entry
            }
            
            const intersect = [...this.moderators].filter(pubkey => entry.payload.value.deletedBy.has(pubkey)) // intersect moderator set and deletedBy
            if (intersect.length > 0){ // if there is an intersection, one of our moderators has deleted this post
                entry.payload.value.hide = true
                return entry
            }
        })
    }
    async post(post: Post){
        const hash = await this.db.add(post)
        return hash
    }
    async delete(hash: string){
        return await this.db.del(hash) // returns hash of delete operation
    }
    read(options?: {
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
        //TODO: find, handle new entries
    }
}
export = Thread