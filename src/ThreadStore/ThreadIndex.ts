import {Post} from '../Post'
export class ThreadIndex {
    _index: Map<string,LogEntry<Post>> //{[key: string]: LogEntry<Post>}
    _threads: {[key: string]: Map<string, LogEntry<Post>>} // contains posts separated in threads
    _topics: Set<string>
    _postcounts: {[key: string]: number}
    bumpLimit: number
    threadLimit: number
    constructor() {
      this._index = new Map<string,LogEntry<Post>>()
      this._threads = {}
      this._topics = new Set<string>()
      this._postcounts = {}
      this.bumpLimit = 250
      this.threadLimit = 128
    }
    
    get() {
      return Array.from(this._index.values())
    }
    getMap(){
      return this._index
    }
    updateThreads(item: LogEntry<Post>){
      const OP = item.payload.op
      var topic: string = item.payload.value.topic
      if (!topic && OP !== 'ADD') return
      if (!topic && OP === 'ADD'){
        // new thread
        topic = item.hash
        this._threads[topic] = new Map<string, LogEntry<Post>>()
        this._postcounts[topic] = 1
        this._topics.add(topic)
      }

      /**
      * If the number of threads is above the limit,
      * delete the first thread in the set,
      * which is the one bumped least recently.
      */
      if (this._topics.size > this.threadLimit){
        const lastTopic = this._topics.values().next().value
        this._topics.delete(lastTopic)
      }

      if (!this._topics.has(topic)) return // thread does not exist or was deleted

      this._threads[topic].set(item.hash, item) // add post
      this._postcounts[topic]++ // increase post count

      // never bump if over bump limit
      if (this._postcounts[topic] > this.bumpLimit) return

      if (OP === 'ADD' && !item.payload.value.sage){
        // bump topic to the top of the set
        this._topics.delete(topic)
        this._topics.add(topic)
      }
    }
    applyModeration(item: LogEntry<Post>){
      const OP = item.payload.op
      // we want to delete/undelete a post
      const deleteHash = item.payload.value.delete
      if (!this._index.has(deleteHash)) return // ensure post to be (un)deleted exists

      const deletedPost = this._index.get(deleteHash)
      if (deletedPost.payload.value.deletedBy == undefined) deletedPost.payload.value.deletedBy = new Set<string>([]) // add set if undefined
      if (OP === 'DEL') { // delete post
        deletedPost.payload.value.deletedBy.add(item.identity.publicKey)
      }
      if (OP === 'UNDEL') { // undelete post
        deletedPost.payload.value.deletedBy.delete(item.identity.publicKey)
      }
      this._index.set(deleteHash, deletedPost) // update the (un)deleted post in the index
    }
    updateIndex(oplog: {values: LogEntry<Post>[]}) {
      this._index = new Map<string,LogEntry<Post>>()
      oplog.values.reduce((handled: string[], item: LogEntry<Post>) => {
        if(handled.includes(item.hash)) return handled

        handled.push(item.hash)

        const OP = item.payload.op
        if (!(OP === 'ADD' || OP === 'DEL' || OP === 'UNDEL')) return handled // ignore if not a valid operation

        this._index.set(item.hash, item) // add operation to index

        this.updateThreads(item) // update threads with new posts/ops

        if (OP === 'ADD') return handled // if we're adding a post, we're done

        this.applyModeration(item) // apply actions for DEL/UNDEL
        return handled
      }, [])
    }
  }