import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createConnection, createServer, Socket } from 'node:net'
import { test } from 'node:test'
import { setImmediate, setTimeout } from 'node:timers/promises'
import { Subject } from 'rxjs'
import { bridgeSocketToChannel } from '../src/session/socketChannel.ts'

function channel () {
    return { data$: new Subject<Uint8Array>(), eof$: new Subject<void>(), closed$: new Subject<void>(),
        write: async (_data: Uint8Array) => undefined, eof: async () => undefined, close: async () => undefined }
}

async function connected () {
    const server = createServer({ allowHalfOpen: true })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const port = (server.address() as { port: number }).port
    const accepted = once(server, 'connection')
    const client = createConnection(port, '127.0.0.1')
    const connecting = once(client, 'connect')
    const [socket] = await accepted as [Socket]
    await connecting
    let closed = false
    return { client, socket, async close () {
        if (closed) {
            return
        }
        closed = true
        client.destroy()
        socket.destroy()
        await new Promise<void>(resolve => server.close(() => resolve()))
    } }
}

test('serializes asynchronous writes and sends EOF after the final write', { timeout: 10000 }, async t => {
    const pair = await connected(), remote = channel(), owner = new Subject<void>()
    t.after(async () => { owner.next(); await pair.close() })
    const received: Buffer[] = [], errors: unknown[] = []
    let release: () => void = () => undefined
    const blocked = new Promise<void>(resolve => { release = resolve })
    let active = 0, maxActive = 0, eofBytes = 0
    remote.write = async data => {
        active++
        maxActive = Math.max(maxActive, active)
        await blocked
        received.push(Buffer.from(data))
        active--
    }
    let eof: () => void = () => undefined
    const ended = new Promise<void>(resolve => { eof = resolve })
    remote.eof = async () => { eofBytes = Buffer.concat(received).length; eof() }
    bridgeSocketToChannel(remote, pair.socket, { error: (...args) => errors.push(args) }, 'test', owner)
    try {
        pair.client.write('first')
        await setTimeout(20)
        pair.client.end('second')
        await setTimeout(20)
        assert.equal(active, 1)
        assert.equal(pair.socket.isPaused(), true)
        release()
        await ended
        assert.equal(maxActive, 1)
        assert.equal(Buffer.concat(received).toString(), 'firstsecond')
        assert.equal(eofBytes, 11)
        assert.deepEqual(errors, [])
    } finally { release(); owner.next(); await pair.close() }
})

test('flushes buffered channel output before destroying a closed connection', { timeout: 10000 }, async t => {
    const pair = await connected(), remote = channel(), owner = new Subject<void>()
    t.after(async () => { owner.next(); await pair.close() })
    const errors: unknown[] = [], received: Buffer[] = []
    bridgeSocketToChannel(remote, pair.socket, { error: (...args) => errors.push(args) }, 'test', owner)
    pair.client.on('data', data => received.push(data))
    pair.client.pause()
    const ended = once(pair.client, 'end')
    try {
        const expected = Buffer.alloc(8 * 1024 * 1024, 42)
        for (let offset = 0; offset < expected.length; offset += 65536) {
            remote.data$.next(expected.subarray(offset, offset + 65536))
        }
        assert.ok(pair.socket.writableLength > 0)
        remote.eof$.next()
        remote.closed$.next()
        await setTimeout(30)
        pair.client.resume()
        await ended
        assert.deepEqual(Buffer.concat(received), expected)
        assert.deepEqual(errors, [])
    } finally { owner.next(); await pair.close() }
})

test('handles an asynchronous write failure and releases channel observers', { timeout: 10000 }, async t => {
    const pair = await connected(), remote = channel(), owner = new Subject<void>()
    t.after(async () => { owner.next(); await pair.close() })
    const errors: unknown[] = []
    remote.write = async () => { throw new Error('native write failed') }
    bridgeSocketToChannel(remote, pair.socket, { error: (...args) => errors.push(args) }, 'test', owner)
    try {
        const closed = once(pair.socket, 'close')
        pair.client.write('data')
        await closed
        assert.match(JSON.stringify(errors.map(String)), /native write failed/)
        assert.equal(remote.data$.observers.length, 0)
        assert.equal(remote.eof$.observers.length, 0)
        assert.equal(remote.closed$.observers.length, 0)
        assert.equal(owner.observers.length, 0)
    } finally { owner.next(); await pair.close() }
})

test('ignores late data after EOF and cancels pending writes on session teardown', { timeout: 10000 }, async t => {
    const pair = await connected(), remote = channel(), owner = new Subject<void>()
    t.after(async () => { owner.next(); await pair.close() })
    const errors: unknown[] = []
    let closeCalls = 0, eofCalls = 0, release: () => void = () => undefined
    const blocked = new Promise<void>(resolve => { release = resolve })
    remote.write = async () => blocked
    remote.close = async () => { closeCalls++ }
    remote.eof = async () => { eofCalls++ }
    bridgeSocketToChannel(remote, pair.socket, { error: (...args) => errors.push(args) }, 'test', owner)
    try {
        pair.client.write('data')
        await setTimeout(20)
        remote.eof$.next()
        remote.data$.next(Buffer.from('late'))
        owner.next()
        const closed = pair.socket.destroyed ? Promise.resolve() : once(pair.socket, 'close')
        await closed
        release()
        await setImmediate()
        assert.equal(closeCalls, 0)
        assert.equal(eofCalls, 0)
        assert.deepEqual(errors, [])
        assert.equal(remote.data$.observers.length, 0)
    } finally { release(); await pair.close() }
})
