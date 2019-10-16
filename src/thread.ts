import IPFS from "ipfs";
import OrbitDB from "orbit-db"
import { FeedStore } from "orbit-db-feedstore";
import { Identity } from "orbit-db-identity-provider";
interface LogEntry {
        hash: string,
        id: string,
        payload: { op: string, key?: string, value: object},
        next: object[],
        v: 1,
        clock: object,
        key: string,
        identity: Identity,
        sig: string
}
export class Thread {
    ipfs: ipfs
    orbit: OrbitDB
    address: string
    db: FeedStore<LogEntry>
    ready: Promise<OrbitDB>
    constructor(ipfs: ipfs, orbit: OrbitDB, address?: string){
        this.ipfs = ipfs
        this.orbit = orbit
        this.ready = new Promise((resolve, reject) => {
            if (address == undefined){
                const db = this.orbit.create(Date.now().toString(), 'feed')
            } else {
                this.address = address
                this.orbit.open(this.address)
            }
        })
    }
}