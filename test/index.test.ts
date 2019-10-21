import { expect } from 'chai';
import { initIPFS, initOrbit } from "../src/index"
import OrbitDB from "orbit-db";
import { doesNotReject } from 'assert';
import ThreadStore from '../src/ThreadStore';
import {Post} from '../src/Post'
import Thread from '../src/Thread'
import Identities from 'orbit-db-identity-provider';

const now = Date.now()
const ipfsOptions = {
  repo: `./orbitdb/${now}/ipfs`,
}
const orbitoptions = { directory: `./orbitdb/${now}/orbitdb` }
var node: ipfs;
var orbit: OrbitDB;

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
      const h2 = await db.del(h1)
      expect(db.get(h1).payload.value.deletedBy.has(db.get(h2).identity.publicKey)).eq(true)
      const h3 = await db.undel(h1)
      expect(db.get(h1).payload.value.deletedBy.has(db.get(h2).identity.publicKey)).eq(false)
    })
})
describe('Thread', () => {
  it('posts', async () => {
    const thread = new Thread({ipfs: node, orbit})
    await thread.ready
    const h = await thread.post({time: Date.now(), message:"1"})
    expect(thread.posts[0].hash).eq(h)
    expect(thread.posts[0].payload.value.hide).eq(undefined)
  })
  it('deletes and undeletes posts', async () => {
    const thread = new Thread({ipfs: node, orbit})
    await thread.ready
    const h = await thread.post({time: Date.now(), message:"1"})
    expect(thread.posts[0].hash).eq(h)
    const h2 = await thread.deletePost(h)
    expect(thread.posts[0].payload.value.hide).eq(true)
    const h3 = await thread.undeletePost(h)
    expect(thread.posts[0].payload.value.hide).eq(undefined)
  })
  it('anonymous posting', async () => {
    const thread = new Thread({ipfs: node, orbit, anonymous: true})
    await thread.ready
    const h = await thread.post({time: Date.now(), message:"1"})
    const id = thread.db.get(h).identity.id
    const h2 = await thread.post({time: Date.now(), message:"2"})
    const id1 = thread.db.get(h2).identity.id
    expect(id).not.eq(id1)
  })
  it('custom identity', async () => {
    const identid = `${Date.now()}`
    const identity = await Identities.createIdentity({id: identid, identityKeysPath: `./orbitdb/keys/${Date.now()}`})
    const thread = new Thread({ipfs: node, orbit, identity})
    await thread.ready
    const h = await thread.post({time: Date.now(), message:"1"})
    const id = thread.db.get(h).identity.id
    const h2 = await thread.post({time: Date.now(), message:"2"})
    const id1 = thread.db.get(h2).identity.id
    expect(id).eq(id1).eq(identity.id)
  })
  it('moderation', async () => {
    const moderator = await Identities.createIdentity({id: `mod`, identityKeysPath: `./orbitdb/keys/${Date.now()}`})
    const ks = moderator.provider.keystore
    const user = await Identities.createIdentity({id: `user`, keystore: ks})
    const invalidmod = await Identities.createIdentity({id: `notmod`, keystore: ks})

    const thread = new Thread({ipfs: node, orbit, identity: user, moderators: new Set<string>([moderator.publicKey])})
    await thread.ready
    // making a post
    const h = await thread.post({time: Date.now(), message:"1"})
    const id = thread.db.get(h).identity.id
    expect(id).eq(user.id)

    // deletion by unapproved moderator
    thread.identity = invalidmod
    const h2 = await thread.deletePost(h)
    thread.identity = user
    const id2 = thread.db.get(h2).identity.id
    expect(id2).eq(invalidmod.id)
    expect(thread.posts[0].payload.value.hide).eq(undefined)
    expect(thread.posts[0].payload.value.deletedBy.has(invalidmod.publicKey)).eq(true)
    // deletion by approved moderator
    thread.identity = moderator
    const h3 = await thread.deletePost(h)
    thread.identity = user
    const id3 = thread.db.get(h3).identity.id
    expect(id3).eq(moderator.id)
    expect(thread.posts[0].payload.value.hide).eq(true)
    expect(thread.posts[0].payload.value.deletedBy.has(moderator.publicKey)).eq(true)
  })
  it('post constraints', async () => {
    const thread = new Thread({ipfs: node, orbit})
    await thread.ready
    try {
      const h = await thread.post({time: Date.now(), message:"1", hide: true}) // property not allowed
      expect(false).eq(true)
    } catch {
      expect(true).eq(true)
    }
    expect(thread.posts.length).eq(0)
  })
})