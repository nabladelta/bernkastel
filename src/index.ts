import IPFS from "ipfs";
import OrbitDB from "orbit-db"
import {Thread} from './thread'

export const ipfsOptions = {
    repo: `./orbitdb/default/ipfs`,
    relay: { enabled: true, hop: { enabled: true, active: true } },
    EXPERIMENTAL: {
      pubsub: true,
      dht: true,
    },
    libp2p: {
        config: {
            dht: {
                enabled: true
            }
        }
    }
}
export async function initIPFS(options: object){
    let node = new IPFS(ipfsOptions)
    node.on('error', error => console.error(error.message))
    await new Promise((resolve, reject) => {node.on('ready', resolve)})
    return node
}