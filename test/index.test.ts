import { expect } from 'chai';
import {initIPFS} from "../src/index"
import OrbitDB from "orbit-db";
import { doesNotReject } from 'assert';
import { FeedStore } from 'orbit-db-feedstore';
describe('IPFS & OrbitDB', function() {
    it('starts IPFS and OrbitDB', async () => {
      const now = Date.now()
      const ipfsOptions = {
        repo: `./orbitdb/${now}/ipfs`,
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
      const node = await initIPFS(ipfsOptions)
      const orbit = await OrbitDB.createInstance(node, {directory: `./orbitdb/${now}/orbitdb`})
      const db = (await orbit.create(now.toString(), 'feed')) as FeedStore<string>
      const h = await db.add(now.toString())
      const v = db.get(h)
      expect(v.payload.value).eq(now.toString())
    })
  })