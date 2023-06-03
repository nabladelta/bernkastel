
import crypto from 'crypto'
import { NoiseSecretStream } from '@hyperswarm/secret-stream'
import { RLN, deserializeProof, FileProvider, GroupDataProvider, nullifierInput, RLNGFullProof, serializeProof, VerificationResult, MemoryProvider } from '@bernkastel/rln'
import { existsSync, rmSync } from "fs"
import { Identity } from '@semaphore-protocol/identity'
import { generateMemberCID, verifyMemberCIDProof } from '../src/membercid'
import { Lambdadelta } from '../src'
import Corestore from 'corestore'
import ram from 'random-access-memory'
import { NullifierSpec } from '../src/lambdadelta'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

jest.setTimeout(120000)
describe('Event feed', () => {
    let peerA: { rln: RLN, mcid: string, corestore: any}
    let peerB: { rln: RLN, mcid: string, corestore: any}

    beforeEach(async () => {
        const secretA = "secret1secret1secret1"
        const secretB = "secret2secret2secret2"
        const gData = MemoryProvider.write(
            [
                GroupDataProvider.createEvent(new Identity(secretA).commitment, 2),
                GroupDataProvider.createEvent(new Identity(secretB).commitment)
            ],
            undefined)

        const rln = await RLN.loadMemory(secretA, gData)
        const rlnB = await RLN.loadMemory(secretB, gData)

        const pubkeyA = crypto.createHash('sha256').update(secretA).update('fakekey').digest()
        const pubkeyB = crypto.createHash('sha256').update(secretB).update('fakekey').digest()
        const mockStreamA: NoiseSecretStream = {publicKey: pubkeyA, remotePublicKey: pubkeyB} as NoiseSecretStream // Stream from persp. of A
        const mockStreamB: NoiseSecretStream = {publicKey: pubkeyB, remotePublicKey: pubkeyA} as NoiseSecretStream // Stream from persp. of B

        const proofA = await generateMemberCID(secretA, mockStreamA, rln)
        const proofB = await generateMemberCID(secretB, mockStreamB, rlnB)

        const corestoreA = new Corestore(ram, {primaryKey: Buffer.from(secretA)})
        const corestoreB = new Corestore(ram, {primaryKey: Buffer.from(secretB)})
        const s1 = corestoreA.replicate(true)
        const s2 = corestoreB.replicate(false)

        s1.pipe(s2).pipe(s1)
        peerA = {rln, mcid: proofA.signal, corestore: corestoreA}
        peerB = {rln: rlnB, mcid: proofB.signal, corestore: corestoreA.namespace('b')}
    })

    afterEach(async () => {
    })

    it('Replicates events', async () => {
        const topic = "a"
        const eventTypePost = "POST"
        const postNullifierSpec: NullifierSpec = {
            messageLimit: 1,
            epoch: 1
        }
        const feedA = new Lambdadelta(topic, peerA.corestore, peerA.rln)
        feedA.addEventType(eventTypePost, [postNullifierSpec, postNullifierSpec], 1000)

        const feedB = new Lambdadelta(topic, peerB.corestore, peerB.rln)
        feedB.addEventType(eventTypePost, [postNullifierSpec, postNullifierSpec], 1000)

        await feedA.newEvent(eventTypePost, Buffer.from("test1"))

        await feedB.newEvent(eventTypePost, Buffer.from("test2"))

        expect(await feedA.getCoreLength()).toEqual(1)
        expect(await feedB.getCoreLength()).toEqual(1)
        feedA.on('syncEventReceivedTime', async (cid, eventID, result) => {
            console.log(`[A]: ${cid} ${eventID} ${result}`)
        })
        feedB.on('syncEventReceivedTime', async (cid, eventID, result) => {
            console.log(`[B]: ${cid} ${eventID} ${result}`)
        })

        feedA.on('publishReceivedTime', async (eventID, time) => {
            console.log(`[A]: EID: ${eventID} Time:  ${time}`)
        })
        feedB.on('publishReceivedTime', async (eventID, time) => {
            const event = await feedB.getEventByID(eventID)
            expect(event?.header.eventType).toEqual(eventTypePost)
            console.log(`[B]: EID: ${eventID} Time: ${time}`)
        })

        await feedA.addPeer(peerB.mcid, feedB.getCoreIDs()[0], feedB.getCoreIDs()[1])
        // Adding twice has no effect
        await feedA.addPeer(peerB.mcid, feedB.getCoreIDs()[0], feedB.getCoreIDs()[1])
        await feedB.addPeer(peerA.mcid, feedA.getCoreIDs()[0], feedA.getCoreIDs()[1])
        let eventsA = (await feedA.getEvents()).map(e => e.content.toString('utf-8'))
        let eventsB = (await feedB.getEvents()).map(e => e.content.toString('utf-8'))
        
        expect(eventsA.length).toEqual(2)
        expect(eventsB.length).toEqual(2)
        expect(await feedA.getCoreLength()).toEqual(2)
        expect(await feedB.getCoreLength()).toEqual(2)

        for (let i = 0; i < 2; i++) {
            expect(eventsA[i]).toEqual(eventsB[i])
        }
        await sleep(1000)
        const result = await feedA.newEvent(eventTypePost, Buffer.from("test3"))
        expect(result).toEqual(VerificationResult.VALID)
        await sleep(1000)
        expect(await feedA.getCoreLength()).toEqual(3)
        expect(await feedB.getCoreLength()).toEqual(3)
        eventsA = (await feedA.getEvents()).map(e => e.content.toString('utf-8'))
        eventsB = (await feedB.getEvents()).map(e => e.content.toString('utf-8'))
        
        for (let i = 0; i < 3; i++) {
            expect(eventsA[i]).toEqual(eventsB[i])
        }
    })

    it("Throws on unknown peer", () => {
        const feedA = new Lambdadelta('a', peerA.corestore, peerA.rln)
        expect(() => feedA['getPeer']('test')).toThrow
    })

    it("Sets and unsets times", () => {
        const feedA = new Lambdadelta('a', peerA.corestore, peerA.rln)
        feedA['setTime']('test', 100)
        feedA['setTime']('test2', 100)
        feedA['unsetTime']('test1')
    })

    it("Calls onInvalidInput with just undefined", () => {
        const feedA = new Lambdadelta('a', peerA.corestore, peerA.rln)
        expect(feedA['onInvalidInput']('test', undefined, undefined)).toBe(true)
    })

    it("Handles index confusion", () => {
        const feedA = new Lambdadelta('a', peerA.corestore, peerA.rln)
        expect(() => feedA['onDuplicateInput']('test', 'test', 0, undefined)).toThrow
        expect(() => feedA['onDuplicateInput']('test', 'test', 1, 1)).toThrow
    })

    it("Consensus time calculation", () => {
        const feedA = new Lambdadelta('a', peerA.corestore, peerA.rln)
        expect(Math.floor(feedA['calculateConsensusTime']([10, 100, 1000, 0], 4))).toEqual(36)
        expect(feedA['calculateConsensusTime']([0, 1, 1000, 1001], 4)).toEqual(500.5)
    })

})