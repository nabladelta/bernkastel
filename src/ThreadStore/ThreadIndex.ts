import {Post} from '../Post'
export class ThreadIndex {
    _index: Map<string,LogEntry<Post>> //{[key: string]: LogEntry<Post>}
    constructor() {
      this._index = new Map<string,LogEntry<Post>>()
    }
    
    get() {
      return Array.from(this._index.values())
    }
  
    updateIndex(oplog: {values: LogEntry<Post>[]}) {
      this._index = new Map<string,LogEntry<Post>>()
      oplog.values.reduce((handled: string[], item) => {
        if(!handled.includes(item.hash)) {
          handled.push(item.hash)

          const OP = item.payload.op
          if (OP === 'ADD') { // we want to add a post
            this._index.set(item.hash, item)
          }
          if (OP === 'DEL' || OP === 'UNDEL') { // we want to delete/undelete a post
            const deleteHash = item.payload.value.delete
            const deletedPost = this._index.get(deleteHash)
            if (this._index.has(deleteHash)){ // post to be (un)deleted exists
              if (deletedPost.payload.value.deletedBy == undefined) deletedPost.payload.value.deletedBy = new Set<string>([]) // add set if undefined
              if (OP === 'DEL'){ // delete post
                deletedPost.payload.value.deletedBy.add(item.identity.publicKey)
              }
              if (OP === 'UNDEL') { // undelete post
                deletedPost.payload.value.deletedBy.delete(item.identity.publicKey)
              }
              this._index.set(deleteHash, deletedPost)
            }
          }
        }
        return handled
      }, [])
    }
  }