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
export default class Thread {
    public ipfs: IPFS
    public orbit: OrbitDB
    public db: ThreadStore
    public ready: Promise<void> // resolves when the thread is ready
    public moderators: Set<string> // ids of moderators
    public ownPosts: Set<string> // hashes of own posts
    public anonymous: boolean
    public cid: string //cid of announce file
    // Keystores
    _anonymousKeystore: Keystore
    _defaultKeystore: Keystore
    _customKeystore: Keystore
    _anonymousKeystorePath: string
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
                //await this.announce(address)
                //await this.discoverPeers()
                this.db = await this.orbit.open(address) as ThreadStore
            }
            this._defaultKeystore = this.db.identity.provider.keystore
            if (identity) {
                this.identity = identity
                this._customKeystore = identity.provider.keystore
            }
            this._anonymousKeystorePath = `./orbitdb/anonymous/${Date.now()}`
            const anonId = await Identities.createIdentity({identityKeysPath: this._anonymousKeystorePath, id:`${Date.now()}`})
            this._anonymousKeystore = this.identity.provider.keystore
            if (anonymous) {
                this.identity = anonId
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
    validateModeration(entry: LogEntry<Post>){
        if (this.ownPosts.has(entry.hash)){ // mark own posts as such
            entry.payload.value.own = true
        }
        delete entry.payload.value.hide
        if (entry.payload.value.deletedBy == undefined) return entry // no one has deleted this entry

        if (entry.payload.value.deletedBy.has(entry.identity.publicKey)){ // deleted by the original creator
            entry.payload.value.hide = true
            return entry
        }
        
        const intersect = [...Array.from(this.moderators)].filter(pubkey => entry.payload.value.deletedBy.has(pubkey)) // intersect moderator set and deletedBy
        if (intersect.length > 0) { // if there is an intersection, one of our moderators has deleted this post
            entry.payload.value.hide = true
            return entry
        }
        return entry
    }
    get posts(){
        return this.db.all.map((entry) => this.validateModeration(entry))
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
    async announce(address?: string){
        if (!address) address = `${this.db.address.root}/${this.db.address.path}`
        const file = await this.ipfs.add(Buffer.from(address))
        this.cid = file[0].hash
        return file[0].hash as string
    }
    async discoverPeers(){
        if (!this.cid) await this.announce()
        const provs: IPFS.PeerInfo[] = await this.ipfs.dht.findProvs(this.cid, {timeout: 10000})
        for (var prov of provs) {
            if (prov.id.toB58String() == (await this.ipfs.id()).id) continue
            console.log("Connecting to ", prov.id.toB58String(), await this.ipfs.swarm.connect('/p2p-circuit/ipfs/'+prov.id.toB58String()))
        }
    }
}