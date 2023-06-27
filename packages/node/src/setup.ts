import { RLN } from "@nabladelta/rln"
import { BBNode } from "@bernkastel/core"
import { DATA_FOLDER, GROUPID, GROUP_FILE, SECRET, TOPICS } from './constants'

export async function nodeSetup(logger: any) {
    const rln = await RLN.load(SECRET!, GROUP_FILE)
    const node = new BBNode(SECRET!, GROUPID, rln, {memstore: true, logger, dataFolder: DATA_FOLDER})
    await node.ready()
    await node.join(TOPICS!.split(','))
    return { node }
}