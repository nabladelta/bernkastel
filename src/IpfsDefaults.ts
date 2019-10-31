const options = {
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
export default options