import { Helia } from "helia";
import { buffers, Buffers } from "./heliaBuffer";
import { Crypter } from "@nabladelta/lambdadelta";
import { CID } from "multiformats/cid";
import { deserializePost, serializePost } from "./utils";
import { TYPE_POST } from "./bernkastel";
export class ContentManager {
    private ipfs: Helia
    private ipfsBuffers: Buffers

    constructor(ipfs: Helia, encryption?: Crypter) {
        this.ipfs = ipfs;
        this.ipfsBuffers = buffers(ipfs, encryption);
    }

    public async getPost(payloadCID: string): Promise<IPost> {
        const cid = CID.parse(payloadCID)
        const buf = await this.ipfsBuffers.get(cid)
        this.ipfs.pins.add(cid)
        return deserializePost(buf)
    }

    public async removePost(payloadCID: string): Promise<void> {
        const cid = CID.parse(payloadCID)
        this.ipfs.pins.rm(cid)
    }

    public async addPost(post: IPost): Promise<string> {
        const cid = await this.ipfsBuffers.add(serializePost(post))
        this.ipfs.pins.add(cid)
        return cid.toString()
    }
    
    protected async validateContent(eventID: string, eventType: string, buf: Buffer): Promise<boolean> {
        try {
            const post = deserializePost(buf)
            if (eventType == TYPE_POST) {
                if (!post.resto || post.resto.length == 0) {
                    return false
                }
            }
            // const originalHash = crypto.createHash('sha256').update(buf).digest('hex')
            // const reSerialized = serializePost(post)
            // const reHash = crypto.createHash('sha256').update(reSerialized).digest('hex')
            // // Post MUST be the same after re-serialization
            // // Otherwise, it means that the post has extraneous data in it
            // if (originalHash !== reHash) {
            //     return false
            // }

        } catch (e) {
            return false
        }
        return true
    }
}