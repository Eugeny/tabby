import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SuspendedOutputBuffer } from '../src/frontends/suspendedOutput.ts'

const MB = 1024 * 1024
const marker = '\x1b[0m[... earlier output dropped ...]\r\n'

/** A 64 KB chunk whose content says which chunk it is */
function numberedChunk (i: number): string {
    return Buffer.alloc(64 * 1024, `chunk ${String(i).padStart(4, '0')}\n`).toString()
}

describe('SuspendedOutputBuffer', () => {
    it('replays buffered output in order on drain', () => {
        const buffer = new SuspendedOutputBuffer()
        buffer.push('hello ')
        buffer.push('world\r\n')
        assert.equal(buffer.drain(), 'hello world\r\n')
        assert.equal(buffer.empty, true)
        assert.equal(buffer.drain(), '')
    })

    it('keeps only the newest 1 MB and marks dropped output', () => {
        const buffer = new SuspendedOutputBuffer()
        for (let i = 0; i < 32; i++) {   // 2 MB
            buffer.push(numberedChunk(i))
        }
        const drained = buffer.drain()
        assert.ok(drained.startsWith(marker), 'dropped output is not marked')
        const body = drained.slice(marker.length)
        assert.equal(body.length, MB)
        // the newest 16 chunks (16..31), in order
        assert.equal(body.slice(0, 64 * 1024), numberedChunk(16))
        assert.equal(body.slice(-64 * 1024), numberedChunk(31))
    })

    it('exposes the same output without clearing it, for recovery state', () => {
        const buffer = new SuspendedOutputBuffer()
        buffer.push('before\r\n')
        buffer.push('after\r\n')
        assert.equal(buffer.value, 'before\r\nafter\r\n')
        assert.equal(buffer.value, 'before\r\nafter\r\n')
        assert.equal(buffer.drain(), 'before\r\nafter\r\n')
        assert.equal(buffer.value, '')
    })

    it('retains a single oversized write and ignores empty writes', () => {
        const buffer = new SuspendedOutputBuffer()
        buffer.push('')
        const big = numberedChunk(0).repeat(20)
        buffer.push(big)
        assert.equal(buffer.value, big)
        assert.equal(buffer.drain(), big)
    })

    it('resets the truncation marker after each drain', () => {
        const buffer = new SuspendedOutputBuffer()
        for (let i = 0; i < 32; i++) {
            buffer.push(numberedChunk(i))
        }
        buffer.drain()
        buffer.push('fresh\r\n')
        assert.equal(buffer.drain(), 'fresh\r\n')
    })
})
