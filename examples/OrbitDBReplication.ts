import {initIPFS, initOrbit} from '../src/index'
import EventStore from "orbit-db-eventstore"

import IPFS from 'ipfs'
var root: string
var path: string
(async () => {
    const now = Date.now()
    const ipfsOptions = { repo: `./orbitdb/a/${now}/ipfs`}
    let ipfs = await initIPFS(ipfsOptions)
    let orbit = await initOrbit(ipfs, { directory: `./orbitdb/${now}/orbitdb` })
    let log = await orbit.log('test')
    const h = await log.add("1")
    root = log.address.root
    path = log.address.path
    console.log(await ipfs.add(Buffer.from(`${root}/${path}`)))
    //console.log(await ipfs.dht.provide(root))
    var i = 2
    setInterval(async () => {
        console.log("A alive")
        await log.add(i.toString())
        i++
    }, 10000);

    (async () => {
        const ipfsOptions = {
            repo: `./orbitdb/b/${Date.now()}/ipfs`,
            config: {
                Addresses: {
                    Swarm: [
                      '/ip4/0.0.0.0/tcp/4012',
                      '/ip4/127.0.0.1/tcp/4013/ws'
                    ],
                    API: '/ip4/127.0.0.1/tcp/5012',
                    Gateway: '/ip4/127.0.0.1/tcp/9191'
                  }
            }
        }
        let ipfs = await initIPFS(ipfsOptions)
        let orbit = await initOrbit(ipfs, { directory: `./orbitdb/${now}/orbitdb` })
        var db: EventStore<string>
        setTimeout(async () => {
            const cid = await ipfs.add(Buffer.from(`${root}/${path}`))
            
            const t1 = Date.now()
            const provs: IPFS.PeerInfo[] = await ipfs.dht.findProvs(cid[0].hash, {timeout: 9000})
            console.log(Date.now() - t1)
            for (var prov of provs) {
                if (prov.id.toB58String() == (await ipfs.id()).id) continue

                console.log(prov.id.toB58String())
                console.log("Connecting", await ipfs.swarm.connect('/p2p-circuit/ipfs/'+prov.id.toB58String()))
            }
            db = (await orbit.open(`${root}/${path}`)) as EventStore<string>
            await db.load()
            db.events.on('replicated', async()=> {
                console.log(db.iterator({limit: -1}).collect())
            })
            setInterval(async () => {
                console.log("B alive")
                //console.log(await ipfs.pubsub.peers())
            }, 10000)
        }, 10000)
    })();
})();