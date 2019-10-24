import {initIPFS, initOrbit} from '../src/index'
import Thread from '../src/Thread'
var address: string
(async () => {
    const now = Date.now()
    const ipfsOptions = { repo: `./orbitdb/a/${now}/ipfs`}
    let ipfs = await initIPFS(ipfsOptions)
    let orbit = await initOrbit(ipfs, { directory: `./orbitdb/${now}/orbitdb` })
    const thread = new Thread({ipfs, orbit})
    await thread.ready
    address = `${thread.db.address.root}/${thread.db.address.path}`
    console.log(await thread.announce())
    var i = 1
    setInterval(async () => {
        console.log("A Posting ", i)
        await thread.post({time: Date.now(), message: `${i}`})
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
        setTimeout(async () => {
            const thread = new Thread({ipfs, orbit, address})
            await thread.ready
            const t1 = Date.now()
            await thread.discoverPeers()
            console.log(Date.now() - t1)
            thread.bindOnReplicated(async()=> {
                console.log(thread.posts)
            })
            setInterval(async () => {
                console.log("B alive")
            }, 10000)
        }, 10000)
    })();
})();