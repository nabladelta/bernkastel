import IPFS from "ipfs";
import OrbitDB from "orbit-db"
import ThreadStore from './ThreadStore'
import ThreadAccessController from './ThreadAccessController'
import AccessControllers from 'orbit-db-access-controllers'
import Thread from "./Thread";
import IpfsOptions from './IpfsDefaults'
export async function initIPFS(options: {[key: string]: any}){
    options = {...IpfsOptions, ...options}
    let node = new IPFS(options)
    node.on('error', error => console.error(error.message))
    await new Promise((resolve, reject) => {node.on('ready', resolve)})
    return node
}
export async function initOrbit(ipfs: IPFS, options: {[key: string]: any}){
    AccessControllers.addAccessController({AccessController: ThreadAccessController})
    if (!OrbitDB.databaseTypes.includes('thread')){
        OrbitDB.addDatabaseType('thread', ThreadStore)
    }
    options.AccessControllers = AccessControllers
    const orbit = await OrbitDB.createInstance(ipfs, options)
    return orbit
}
export {Thread}