import IPFS from "ipfs";
import OrbitDB from "orbit-db"
import ThreadStore from './ThreadStore'
import {Post} from './Post'
import Identities, { Identity } from "orbit-db-identity-provider";
interface IThreadOptions {
    moderators?: Set<string>
    identity?: Identity
    anonymous?: boolean
}
class Thread {
    public ipfs: IPFS
    public orbit: OrbitDB
    public db: ThreadStore
    public ready: Promise<void> // resolves when the thread is ready
    public moderators: Set<string> // ids of moderators
    public ownPosts: Set<string> // hashes of own posts
    public anonymous: boolean

    constructor(ipfs: IPFS, orbit: OrbitDB, address?: string, options?: IThreadOptions){
        this.ipfs = ipfs
        this.orbit = orbit
        this.ownPosts = new Set<string>([])
        this.ready = new Promise(async (resolve, reject) => {
            if (address == undefined){
                this.db = await this.orbit.create(Date.now().toString(), 'thread', {write: ["*"]}) as ThreadStore
            } else {
                this.db = await this.orbit.open(address) as ThreadStore
            }
            if (options) this.setOptions(options)
            this.db.events.on('replicated', this.replicated)
            resolve()
        })
    }
    setOptions(options: IThreadOptions){
        if (options.moderators) this.moderators = options.moderators
        if (options.identity) this.db.setIdentity(options.identity)
        if (options.anonymous) this.anonymous = options.anonymous
    }
    get posts(){
        return this.db.all.map((entry) => {
            if (entry.payload.value.deletedBy == undefined) return entry // no one has deleted this entry

            if (entry.payload.value.deletedBy.has(entry.identity.id)){ // deleted by the original creator
                entry.payload.value.hide = true
                return entry
            }
            
            const intersect = [...this.moderators].filter(id => entry.payload.value.deletedBy.has(id)) // intersect moderator set and deletedBy
            if (intersect.length > 0){ // if there is an intersection, one of our moderators has deleted this post
                entry.payload.value.hide = true
                return entry
            }
            return entry
        })
    }
    async post(post: Post){
        if (this.anonymous){
            const identity = await Identities.createIdentity({identityKeysPath: `./orbitdb/keys/${Date.now()}`})
            this.db.setIdentity(identity)
        }
        const hash = await this.db.add(post)
        this.ownPosts.add(hash)
        return hash
    }
    async deletePost(hash: string){
        return await this.db.del(hash) // returns hash of delete operation
    }
    async undeletePost(hash: string){
        return await this.db.undel(hash) // returns hash of undelete operation
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