import EventStore from "orbit-db-eventstore"
import {ThreadIndex} from './ThreadIndex'
import { Post } from "../Post"
class ThreadStore extends EventStore<Post> {
    _type: string
    _index: ThreadIndex
    constructor (ipfs: any, id: any, dbname: string, options: IStoreOptions) {
      if(!options) options = {}
      if(!options.Index) Object.assign(options, {Index: ThreadIndex})
      super(ipfs, id, dbname, options)
      this._type = 'thread'
    }
    get all (){
      return Array.from(this._index._index.values())
    }
    del (hash: string) {
      const operation = {
        op: 'DEL',
        key: null,
        value: {time: Date.now(), delete: hash}
      }
      return this._addOperation(operation) as Promise<string>
    }
    undel (hash: string) { // cancel a deletion
      const operation = {
        op: 'UNDEL',
        key: null,
        value: {time: Date.now(), delete: hash}
      }
      return this._addOperation(operation) as Promise<string>
    }
  }
  export = ThreadStore
