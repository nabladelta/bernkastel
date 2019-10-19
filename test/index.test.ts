import { expect } from 'chai';
import { initIPFS, initOrbit } from "../src/index"
import OrbitDB from "orbit-db";
import { doesNotReject } from 'assert';
import ThreadStore from '../src/ThreadStore';
import {Post} from '../src/Post'
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
const orbitoptions = { directory: `./orbitdb/${now}/orbitdb` }
var node;
var orbit;
describe('IPFS & OrbitDB', function() {
    it('starts IPFS and OrbitDB', async () => {
      node = await initIPFS(ipfsOptions)
      orbit = await initOrbit(node, orbitoptions)
    })
})
describe('ThreadStore', () => {
    it('adds items correctly', async () => {
      const db = (await orbit.create(Date.now().toString(), 'thread')) as ThreadStore
      const post = {time: Date.now(), message: "1"} as Post
      const h = await db.add(post)
      const v = db.get(h)
      expect(v.payload.value).eq(post)
    })
    it('returns items in the right order', async () => {
      const db = (await orbit.create(Date.now().toString(), 'thread')) as ThreadStore
      const h1 = await db.add({time: Date.now(), message: "1"})
      const h2 = await db.add({time: Date.now(), message: "2"})
      const h3 = await db.add({time: Date.now(), message: "3"})
      expect(db.all[2].hash).eq(h3)
      expect(db.all[1].hash).eq(h2)
      expect(db.all[0].hash).eq(h1)
    })
    it('marks deleted posts and undeletes', async () => {
      const db = (await orbit.create(Date.now().toString(), 'thread')) as ThreadStore
      const h1 = await db.add({time: Date.now(), message: "1"})
      const h2 = await db.remove(h1)
      expect(db.get(h1).payload.value.deletedBy.has(db.get(h2).identity.id)).eq(true)
      const h3 = await db.undel(h1)
      expect(db.get(h1).payload.value.deletedBy.has(db.get(h2).identity.id)).eq(false)
    })
})