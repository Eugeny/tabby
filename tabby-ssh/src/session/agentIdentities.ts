const SSH_AGENTC_REQUEST_IDENTITIES = 11
const SSH_AGENT_IDENTITIES_ANSWER = 12

export function buildRequestIdentitiesMessage (): Uint8Array {
    return new Uint8Array([0, 0, 0, 1, SSH_AGENTC_REQUEST_IDENTITIES])
}

/**
 * Parses an SSH agent reply to REQUEST_IDENTITIES.
 * Returns the public key blobs once the whole message has been received,
 * or null if more data is needed. Throws if the agent sent a different reply.
 */
export function parseIdentitiesAnswer (data: Uint8Array): Uint8Array[]|null {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    if (data.length < 4) {
        return null
    }
    const length = view.getUint32(0)
    if (data.length < 4 + length) {
        return null
    }
    if (length < 1 || data[4] !== SSH_AGENT_IDENTITIES_ANSWER) {
        throw new Error(`Unexpected SSH agent reply type ${data[4]}`)
    }

    const end = 4 + length
    let offset = 5
    const readString = (): Uint8Array => {
        if (offset + 4 > end) {
            throw new Error('Truncated SSH agent reply')
        }
        const size = view.getUint32(offset)
        offset += 4
        if (offset + size > end) {
            throw new Error('Truncated SSH agent reply')
        }
        const value = data.subarray(offset, offset + size)
        offset += size
        return value
    }

    if (offset + 4 > end) {
        throw new Error('Truncated SSH agent reply')
    }
    const count = view.getUint32(offset)
    offset += 4
    const blobs: Uint8Array[] = []
    for (let i = 0; i < count; i++) {
        blobs.push(readString())
        readString() // comment
    }
    return blobs
}

export function agentHasIdentity (identities: readonly Uint8Array[], publicKeyBlob: Uint8Array): boolean {
    return identities.some(blob => blob.length === publicKeyBlob.length && blob.every((byte, i) => byte === publicKeyBlob[i]))
}
