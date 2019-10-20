import IPFS from "ipfs";
import OrbitDB from "orbit-db"
import ThreadStore from './ThreadStore'
import {Post} from './Post'
import Identities, { Identity } from "orbit-db-identity-provider";
import { Keystore } from "orbit-db-keystore";
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
    _anonymousKeystore: Keystore

    constructor({ ipfs, orbit, address, moderators = new Set<string>(), anonymous = false, identity } : 
                {ipfs: IPFS, orbit: OrbitDB, address?: string, moderators?: Set<string>, anonymous?: boolean, identity?: Identity}){
        this.ipfs = ipfs
        this.orbit = orbit
        this.ownPosts = new Set<string>()
        this.moderators = moderators
        this.anonymous = anonymous
        this.ready = new Promise(async (resolve, reject) => {
            if (address == undefined){
                this.db = await this.orbit.create(Date.now().toString(), 'thread', {accessController: { type: 'thread', write: ["*"] }}) as ThreadStore
            } else {
                this.db = await this.orbit.open(address) as ThreadStore
            }
            if (identity) this.identity = identity
            if (anonymous) {
                this.identity = await Identities.createIdentity({identityKeysPath: `./orbitdb/anonymous/${Date.now()}`, id:`${Date.now()}`})
                this._anonymousKeystore = this.identity.provider.keystore
            }
            this.bindOnReplicated(this.replicated)
            resolve()
        })
    }
    get identity (){
        return this.db ? this.db.identity : undefined
    }
    set identity (identity: Identity) {
        this.db.setIdentity(identity)
    }
    get posts(){
        return this.db.all.map((entry) => {
            if (this.ownPosts.has(entry.hash)){ // mark own posts as such
                entry.payload.value.own = true
            }
            delete entry.payload.value.hide
            if (entry.payload.value.deletedBy == undefined) return entry // no one has deleted this entry

            if (entry.payload.value.deletedBy.has(entry.identity.id)){ // deleted by the original creator
                entry.payload.value.hide = true
                return entry
            }
            
            const intersect = [...Array.from(this.moderators)].filter(id => entry.payload.value.deletedBy.has(id)) // intersect moderator set and deletedBy
            if (intersect.length > 0) { // if there is an intersection, one of our moderators has deleted this post
                entry.payload.value.hide = true
                return entry
            }
            return entry
        })
    }
    async post(post: Post){
        if (this.anonymous){
            const identity = await Identities.createIdentity({id:`${Date.now()}`, keystore: this._anonymousKeystore})
            this.identity = identity
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
    async replicated(_address: string){ // fired whenever we receive new posts from other peers
        //TODO: find, handle new entries
    }
    bindOnReplicated(fn: (a: string) => void){ // bind a function to the replicate event
        this.db.events.on('replicated', fn)
    }
}
export = Thread