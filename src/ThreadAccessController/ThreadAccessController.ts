import OrbitDBAccessController from 'orbit-db-access-controllers/src/orbitdb-access-controller'
import { Post } from '../Post'
import OrbitDB from 'orbit-db'
import Identities from 'orbit-db-identity-provider'
const pMapSeries = require('p-map-series')
export default class ThreadAccessController extends OrbitDBAccessController{
    static get type () { return 'thread' }
    get type () {return 'thread'}
    constructor (orbitdb: OrbitDB, options: any) {
        super(orbitdb, options)
      }
    async canAppend(entry: LogEntry<Post>, identityProvider: Identities){
        if (!super.canAppend(entry, identityProvider)) return false
        const post = entry.payload.value
        if (!post.time) return false
        if (post.message && post.message.length > 4000) return false
        if (post.title && post.title.length > 128) return false
        if (post.author && post.author.length > 128) return false
        if (post.quote && post.quote.length > 64) return false
        if (post.attachments && post.attachments.length > 64) return false
        if (post.delete && post.delete.length > 64) return false
        if (post.deletedBy || post.own || post.hide) return false // forbidden properties
        return true
    }
    static async create (orbitdb: OrbitDB, options: any) {
        const ac = new ThreadAccessController(orbitdb, options)
        await (ac as OrbitDBAccessController).load(options.address || options.name || 'default-access-controller')
        // Add write access from options
        if (options.write && !options.address) {
          await pMapSeries(options.write, async (e) => (ac as OrbitDBAccessController).grant('write', e))
        }
    
        return ac
    }

}