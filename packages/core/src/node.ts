import { LDNodeBase, Lambdadelta }  from "@nabladelta/lambdadelta"
import { BulletinBoard } from "./board"

export class BBNode extends LDNodeBase<BulletinBoard> {
    public static appID = "BBS"
    public static protocolVersion = "1"

    protected newFeed(topicHash: string) {
        const board = new BulletinBoard(topicHash, this.corestore, this.rln!)
        const logger = this.getSubLogger({name: `T:${topicHash.slice(0, 6)}`})
        const eventNames = [
            'peerAdded',
            'peerRemoved',
            'publishReceivedTime',
            'syncEventStart',
            'syncFatalError',
            'syncEventResult',
            'syncPayloadResult',
            'syncDuplicateEvent',
            'syncEventReceivedTime',
            'timelineAddEvent',
            'timelineRemoveEvent',
            'timelineRejectedEvent',
            'consensusTimeChanged',
            'syncCompleted',
            'peerUpdate'
        ] as const

        for (let name of eventNames) {
            board.on(name, (...args: any[]) => logger.info(`[${name}] ${args.join(' | ')}`))
        }
        return board
    }
}