import {Post} from '../Post'
export class ThreadIndex {
    _index: Map<string,LogEntry<Post>> //{[key: string]: LogEntry<Post>}
    constructor() {
      this._index = new Map<string,LogEntry<Post>>()
    }
    
    get() {
      return Object.keys(this._index).map((f) => this._index[f])
    }
  
    updateIndex(oplog: {values: LogEntry<Post>[]}) {
      this._index = new Map<string,LogEntry<Post>>()
      oplog.values.reduce((handled: string[], item) => {
        if(!handled.includes(item.hash)) {
          handled.push(item.hash)
          if(item.payload.op === 'ADD') {
            this._index.set(item.hash, item)
          } else if(item.payload.op === 'DEL') {
            const deleteHash = item.payload.value.delete
            if (this._index.has(deleteHash)){ // post to be deleted exists
              const deletePost = this._index.get(item.payload.value.delete)
              deletePost.payload.value.deleted.push([item.hash, item.identity.publicKey])
              this._index.set(deleteHash, deletePost)
            }
          }
        }
        return handled
      }, [])
    }
  }