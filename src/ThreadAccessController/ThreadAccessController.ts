import OrbitDBAccessController from 'orbit-db-access-controllers/src/orbitdb-access-controller'
export default class ThreadAccessController extends OrbitDBAccessController{
    static get type () { return 'thread' }

}