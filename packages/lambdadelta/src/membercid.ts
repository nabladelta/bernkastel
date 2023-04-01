import crypto from 'crypto'
import { NoiseSecretStream } from '@hyperswarm/secret-stream'
import { Delta, Lambda, nullifierInput, RLNGFullProof, VerificationResult } from 'bernkastel-rln'
import { getMemberCIDEpoch, getTimestampInSeconds } from '../src/utils'

const RLN_IDENTIFIER = "1000"

export async function generateMemberCID(secret: string, stream: NoiseSecretStream, delta: Delta) {
    const externalNullifier: nullifierInput = {
        nullifier: `${getMemberCIDEpoch()}|${stream.remotePublicKey.toString('hex')}`,
        messageId: 1,
        messageLimit: 1
    }
    const id = crypto.createHash('sha256').update(secret).update(externalNullifier.nullifier).digest('hex')
    return await delta.createProof(id, [externalNullifier, externalNullifier], RLN_IDENTIFIER)
}

export async function verifyMemberCIDProof(proof: RLNGFullProof, stream: NoiseSecretStream, lambda: Lambda) {
    const nullifier = proof.externalNullifiers[0]
    const expectedNullifier = `${getMemberCIDEpoch()}|${stream.publicKey.toString('hex')}`
    if (expectedNullifier !== nullifier.nullifier) {
        return false
    }

    if (nullifier.messageLimit !== 1) {
        return false
    }

    if (proof.rlnIdentifier !== RLN_IDENTIFIER) {
        return false
    }
    const result = await lambda.submitProof(proof, getTimestampInSeconds())
    return (result === VerificationResult.VALID || result === VerificationResult.DUPLICATE)
}