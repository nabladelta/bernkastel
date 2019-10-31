import {initIPFS} from '../src/index'

async function s() {
    await initIPFS({ repo: './orbitdb/relay/ipfs'})
}
s()