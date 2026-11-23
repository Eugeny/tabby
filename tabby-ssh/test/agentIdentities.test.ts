import assert from 'node:assert/strict'
import test from 'node:test'
import { agentHasIdentity, buildRequestIdentitiesMessage, parseIdentitiesAnswer } from '../src/session/agentIdentities.ts'

const sshString = (value: Uint8Array): number[] => [0, 0, 0, value.length, ...value]

const identitiesAnswer = (...blobs: Uint8Array[]): Uint8Array => {
    const body = [12, 0, 0, 0, blobs.length]
    for (const blob of blobs) {
        body.push(...sshString(blob), ...sshString(new TextEncoder().encode('comment')))
    }
    return new Uint8Array([0, 0, 0, body.length, ...body])
}

test('builds a REQUEST_IDENTITIES message', () => {
    assert.deepEqual([...buildRequestIdentitiesMessage()], [0, 0, 0, 1, 11])
})

test('parses an empty identity list', () => {
    assert.deepEqual(parseIdentitiesAnswer(identitiesAnswer()), [])
})

test('parses identity blobs and matches a public key', () => {
    const keyA = new Uint8Array([1, 2, 3])
    const keyB = new Uint8Array([4, 5, 6, 7])
    const identities = parseIdentitiesAnswer(identitiesAnswer(keyA, keyB))!
    assert.equal(identities.length, 2)
    assert.equal(agentHasIdentity(identities, new Uint8Array([4, 5, 6, 7])), true)
    assert.equal(agentHasIdentity(identities, new Uint8Array([4, 5, 6])), false)
    assert.equal(agentHasIdentity([], keyA), false)
})

test('waits for the rest of a partially received reply', () => {
    const answer = identitiesAnswer(new Uint8Array([1, 2, 3]))
    assert.equal(parseIdentitiesAnswer(answer.subarray(0, 3)), null)
    assert.equal(parseIdentitiesAnswer(answer.subarray(0, answer.length - 1)), null)
    assert.equal(parseIdentitiesAnswer(answer)!.length, 1)
})

test('rejects a failure reply', () => {
    assert.throws(() => parseIdentitiesAnswer(new Uint8Array([0, 0, 0, 1, 5])))
})

test('rejects an identity count that exceeds the message', () => {
    assert.throws(() => parseIdentitiesAnswer(new Uint8Array([0, 0, 0, 5, 12, 0, 0, 0, 1])))
})
