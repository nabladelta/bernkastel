export class ThreadIndex {
    _index: {[key: string]: LogEntry<Post>}
    constructor() {
      this._index = {}
    }
  
    get() {
      return Object.keys(this._index).map((f) => this._index[f])
    }
  
    updateIndex(oplog: {values: LogEntry<Post>[]}) {
      this._index = {}
      oplog.values.reduce((handled: string[], item) => {
        if(!handled.includes(item.hash)) {
          handled.push(item.hash)
          if(item.payload.op === 'ADD') {
            this._index[item.hash] = item
          } else if(item.payload.op === 'DEL') {
            if (this._index[item.payload.value.delete].payload.value != undefined){
                this._index[item.payload.value.delete].payload.value.deleted.push([item.hash, item.identity.publicKey])
            }
          }
        }
        return handled
      }, [])
    }
  }