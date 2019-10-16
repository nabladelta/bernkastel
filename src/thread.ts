import IPFS from "ipfs";
import OrbitDB from "orbit-db"
export class Thread {
    ipfs: ipfs
    orbit: OrbitDB
    address: string
    ready: Promise<OrbitDB>
    constructor(ipfs: ipfs, orbit: OrbitDB, address?: string){
        this.ipfs = ipfs
        this.orbit = orbit
        if (address == undefined){
            const db = this.orbit.create(Date.now().toString(), 'feed')
        } else {
            this.address = address
            this.orbit.open(this.address)
        }
    }
}