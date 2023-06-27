import { LDNodeBase, Lambdadelta }  from "@nabladelta/lambdadelta"
import { BulletinBoard } from "./board"

export class BBNode extends LDNodeBase<BulletinBoard> {
    public static appID = "BBS"
    public static protocolVersion = "1"

    protected newFeed(topicHash: string) {
        return new BulletinBoard(topicHash, this.corestore, this.rln!)
    }
}