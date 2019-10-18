import OrbitDB from "orbit-db"
import { EventStore } from "orbit-db-eventstore"
import { Store } from "orbit-db-store"
import IPFS from 'ipfs'
import {ThreadIndex} from './ThreadIndex'
export class ThreadStore<T> extends EventStore<T> {
    _type: string
    constructor (ipfs: IPFS, id: any, dbname: string, options: {[key: string]: object}) {
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
