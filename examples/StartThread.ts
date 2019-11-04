import {initIPFS, initOrbit} from '../src/index'
import Thread from '../src/Thread'
var address: string
(async () => {
    const now = Date.now()
    const ipfsOptions = { repo: `./orbitdb/a/${now}/ipfs`}
    let ipfs = await initIPFS({
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
    })
    let orbit = await initOrbit(ipfs, { directory: `./orbitdb/${now}/orbitdb` })
    const thread = new Thread({ipfs, orbit})
    await thread.ready
    thread.bindOnReplicated((a)=>console.log(a))
    address = `${thread.db.address.root}/${thread.db.address.path}`
    console.log(await thread.announce())
    setInterval(async () => {
        console.log("Alive ", address)
    }, 10000)})()