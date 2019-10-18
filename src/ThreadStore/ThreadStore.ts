import { EventStore } from "orbit-db-eventstore"
import {ThreadIndex} from './ThreadIndex'
import { Post } from "../Post"
class ThreadStore extends EventStore<Post> {
    _type: string
    constructor (ipfs: any, id: any, dbname: string, options: {[key: string]: object}) {
      if(!options) options = {}
      if(!options.Index) Object.assign(options, {Index: ThreadIndex})
      super(ipfs, id, dbname, options)
      this._type = 'feed'
    }
  
    remove (hash: string) {
      return this.del(hash)
    }
  
    del (hash: string) {
      const operation = {
        op: 'DEL',
        key: null,
        value: {time: Date.now(), delete: hash}
      }
      return this._addOperation(operation)
    }
  }
  export = ThreadStore
