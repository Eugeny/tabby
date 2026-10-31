import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { ZModemWriteBudget, ZModemWriteBuffer } from '../src/features/zmodemWriteBuffer.ts'

function deferred () {
    let resolve: () => void = () => undefined
    const promise = new Promise<void>(r => { resolve = r })
    return { promise, resolve }
}

describe('batched ZMODEM download writes', () => {
    it('batches small chunks, preserves order, and flushes the final partial batch', async () => {
        const output: number[] = []
        const budget = new ZModemWriteBudget(32)
        const lengths: number[] = []
        const writer = new ZModemWriteBuffer(async data => {
            lengths.push(data.length)
            output.push(...data)
        }, budget, 8)
        writer.push([1, 2, 3])
        writer.push(new Uint8Array([4, 5, 6, 7, 8, 9, 10]))
        await writer.finish()
        assert.deepEqual(output, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        assert.deepEqual(lengths, [8, 2])
        assert.equal(budget.bufferedBytes, 0)
    })

    it('copies input before the producer can mutate it', async () => {
        const budget = new ZModemWriteBudget(16)
        const output: number[] = []
        const writer = new ZModemWriteBuffer(async data => { output.push(...data) }, budget, 8)
        const chunk = new Uint8Array([1, 2, 3])
        writer.push(chunk)
        chunk.fill(9)
        await writer.finish()
        assert.deepEqual(output, [1, 2, 3])
    })

    it('flushes a partial acknowledgement window without ending the file', async () => {
        const output: number[] = []
        const budget = new ZModemWriteBudget(16)
        const writer = new ZModemWriteBuffer(async data => { output.push(...data) }, budget, 8)
        writer.push([1, 2, 3])
        await writer.flush()
        assert.equal(budget.bufferedBytes, 0)
        writer.push([4, 5])
        await writer.finish()
        assert.deepEqual(output, [1, 2, 3, 4, 5])
    })

    it('starts draining again after an earlier batch has completed', async () => {
        const output: number[] = []
        const writer = new ZModemWriteBuffer(async data => { output.push(...data) }, new ZModemWriteBudget(16), 4)
        writer.push([1, 2, 3, 4])
        await setImmediate()
        writer.push([5, 6, 7, 8])
        await writer.finish()
        assert.deepEqual(output, [1, 2, 3, 4, 5, 6, 7, 8])
    })

    it('counts in-flight bytes and drops queued writes immediately on overload', async () => {
        const blocked = deferred()
        const budget = new ZModemWriteBudget(16)
        let writes = 0
        const writer = new ZModemWriteBuffer(async () => { writes++; await blocked.promise }, budget, 8)
        writer.push(new Uint8Array(16))
        assert.equal(budget.bufferedBytes, 16)
        let error: unknown = undefined
        try { writer.push([1]) } catch (e) { error = e }
        assert.match(String(error), /cannot keep up/)
        writer.abort(error)
        assert.equal(budget.bufferedBytes, 8)
        await assert.rejects(writer.failed, /cannot keep up/)
        await assert.rejects(writer.finish(), /cannot keep up/)
        blocked.resolve()
        await setImmediate()
        assert.equal(writes, 1)
        assert.equal(budget.bufferedBytes, 0)
    })

    it('shares an allocation limit across multiple files, even for partial batches', async () => {
        const budget = new ZModemWriteBudget(16)
        const make = () => new ZModemWriteBuffer(async () => undefined, budget, 8)
        const first = make(), second = make(), third = make()
        first.push([1])
        second.push([2])
        assert.throws(() => third.push([3]), /cannot keep up/)
        assert.equal(budget.bufferedBytes, 16)
        first.abort(new Error('cancelled'))
        second.abort(new Error('cancelled'))
        assert.equal(budget.bufferedBytes, 0)
    })

    it('propagates disk failures and releases all queued allocations', async () => {
        const budget = new ZModemWriteBudget(32)
        const writer = new ZModemWriteBuffer(async () => { throw new Error('disk full') }, budget, 8)
        writer.push(new Uint8Array(20))
        await assert.rejects(writer.failed, /disk full/)
        await assert.rejects(writer.finish(), /disk full/)
        assert.equal(budget.bufferedBytes, 0)
    })

    it('does not retain the remainder of a large push after a synchronous sink error', async () => {
        const budget = new ZModemWriteBudget(32)
        const writer = new ZModemWriteBuffer(() => { throw new Error('write failed') }, budget, 8)
        assert.throws(() => writer.push(new Uint8Array(24)), /write failed/)
        await assert.rejects(writer.failed, /write failed/)
        assert.equal(budget.bufferedBytes, 0)
    })

    it('releases queued data on cancellation and performs no subsequent writes', async () => {
        const blocked = deferred()
        const budget = new ZModemWriteBudget(32)
        let writes = 0
        const writer = new ZModemWriteBuffer(async () => { writes++; await blocked.promise }, budget, 8)
        writer.push(new Uint8Array(24))
        writer.abort(new Error('cancelled'))
        assert.equal(budget.bufferedBytes, 8)
        blocked.resolve()
        await setImmediate()
        assert.equal(writes, 1)
        assert.equal(budget.bufferedBytes, 0)
        assert.throws(() => writer.push([1]), /cancelled/)
    })
})
