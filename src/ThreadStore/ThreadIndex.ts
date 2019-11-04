import {Post} from '../Post'
export class ThreadIndex {
    _index: Map<string,LogEntry<Post>> //{[key: string]: LogEntry<Post>}
    _threads: {[key: string]: Map<string, LogEntry<Post>>} // contains posts separated in threads
    _topics: Set<string>
    constructor() {
      this._index = new Map<string,LogEntry<Post>>()
      this._threads = {}
      this._topics = new Set<string>()
    }
    
    get() {
      return Array.from(this._index.values())
    }
    getMap(){
      return this._index
    }
    updateThreads(item: LogEntry<Post>){
      var topic: string = item.payload.value.topic
      if (!topic){
        // new thread
        topic = item.hash
        this._threads[topic] = new Map<string, LogEntry<Post>>()
      }
      // bump topic to the top of the set
      this._topics.delete(topic)
      this._topics.add(topic)

      this._threads[topic].set(item.hash, item) // add post
    }
    updateIndex(oplog: {values: LogEntry<Post>[]}) {
      this._index = new Map<string,LogEntry<Post>>()
      oplog.values.reduce((handled: string[], item: LogEntry<Post>) => {
        if(handled.includes(item.hash)) return handled

        handled.push(item.hash)

        const OP = item.payload.op
        if (!(OP === 'ADD' || OP === 'DEL' || OP === 'UNDEL')) return handled // ignore if not a valid operation

        this._index.set(item.hash, item) // add operation to index

        if (OP === 'ADD') return handled // if we're adding a post, we're done

        // we want to delete/undelete a post
        const deleteHash = item.payload.value.delete
        if (!this._index.has(deleteHash)) return handled // ensure post to be (un)deleted exists

        const deletedPost = this._index.get(deleteHash)
        if (deletedPost.payload.value.deletedBy == undefined) deletedPost.payload.value.deletedBy = new Set<string>([]) // add set if undefined
        if (OP === 'DEL') { // delete post
          deletedPost.payload.value.deletedBy.add(item.identity.publicKey)
        }
        if (OP === 'UNDEL') { // undelete post
          deletedPost.payload.value.deletedBy.delete(item.identity.publicKey)
        }
        this._index.set(deleteHash, deletedPost) // update the (un)deleted post in the index

        this.updateThreads(item)
        return handled
      }, [])
    }
  }