import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { createRequire } from 'node:module'

// zmodem.js is CommonJS; the patched copy lives under this plugin's node_modules.
const require = createRequire(import.meta.url)
const ZModem = require('zmodem.js')

type BeforeAck = () => unknown

function pair (windowSize: number, beforeAck: BeforeAck, onInput: (data: number[]) => void) {
    const receiver = new ZModem.Session.Receive()
    let sender: any = null
    const deliver = (session: any, data: number[]) => queueMicrotask(() => {
        try {
            session.consume(data)
        } catch (error) {
            if (!session.aborted()) {
                throw error
            }
        }
    })
    receiver.set_receive_window(windowSize, beforeAck)
    receiver.set_sender((data: number[]) => {
        if (!sender) {
            sender = new ZModem.Session.Send(ZModem.Header.parse(data)[0])
            sender.set_sender((bytes: number[]) => deliver(receiver, bytes))
        } else {
            deliver(sender, data)
        }
    })
    receiver.on('offer', offer => { offer.accept({ on_input: onInput }) })
    receiver.start()
    return { receiver, sender }
}

test('a finite receive window waits for disk progress and handles subsequent frames', { timeout: 5000 }, async () => {
    let release: () => void = () => undefined
    const blocked = new Promise<void>(resolve => { release = resolve })
    const received: Buffer[] = []
    const { sender, receiver } = pair(32768, () => blocked, data => received.push(Buffer.from(data)))
    try {
        assert.equal(sender._receive_window, 32768)
        const transfer = await sender.send_offer({ name: 'window.bin', size: 100023 })
        const input = Buffer.alloc(100000)
        for (let i = 0; i < input.length; i++) {
            input[i] = i % 251
        }
        let sent = false
        const sending = transfer.send(input).then(() => { sent = true })
        await setImmediate()
        assert.equal(sent, false)
        assert.equal(Buffer.concat(received).length, 32768)
        release()
        await sending
        await transfer.end(Buffer.alloc(23, 42))
        await sender.close()
        assert.deepEqual(Buffer.concat(received), Buffer.concat([input, Buffer.alloc(23, 42)]))
        assert.equal(receiver.has_ended(), true)
    } finally {
        release()
        if (!sender.has_ended()) {
            sender.abort()
        }
    }
})

test('finite-window transfers support empty files and multiple offers', { timeout: 5000 }, async () => {
    const received: Buffer[] = []
    const { sender } = pair(65535, async () => undefined, data => received.push(Buffer.from(data)))
    try {
        await (await sender.send_offer({ name: 'empty.bin', size: 0 })).end()
        const transfer = await sender.send_offer({ name: 'next.bin', size: 3 })
        await transfer.end([1, 2, 3])
        await sender.close()
        assert.deepEqual(Buffer.concat(received), Buffer.from([1, 2, 3]))
    } finally {
        if (!sender.has_ended()) {
            sender.abort()
        }
    }
})

test('skipping a file while its acknowledgement is pending keeps the session going', { timeout: 5000 }, async () => {
    // Ctrl+C in Tabby aborts the file's writer and answers the offer with ZSKIP
    // (zsession._skip()); the flush the pending ZACK was waiting for then fails.
    let failFlush: (error: Error) => void = () => undefined
    const flushes: Promise<void>[] = []
    const received: Buffer[] = []
    const { sender, receiver } = pair(1024, () => {
        const flush = flushes.length ? Promise.resolve() : new Promise<void>((_resolve, reject) => { failFlush = reject })
        flushes.push(flush)
        return flush
    }, data => received.push(Buffer.from(data)))
    try {
        const skipped = await sender.send_offer({ name: 'skipped.bin', size: 4096 })
        const sending = skipped.send(Buffer.alloc(2048, 1))
        await setImmediate()
        assert.equal(flushes.length, 1, 'the first window waits for the flush')
        receiver._skip()
        failFlush(new Error('ZMODEM download cancelled'))
        await assert.rejects(sending, /Peer skipped transfer/)
        await setImmediate()
        assert.equal(receiver.aborted(), false, 'a skipped file must not abort the session')
        assert.equal(sender.aborted(), false)
        // The bundled sender keeps its per-file state after a peer skip (lrzsz
        // clears it and offers the next file), so clear it here.
        sender._sending_file = false
        sender._file_offset = 0
        const next = await sender.send_offer({ name: 'next.bin', size: 3 })
        await next.end([1, 2, 3])
        await sender.close()
        assert.equal(received[0].length, 1024)
        assert.deepEqual(Buffer.concat(received.slice(1)), Buffer.from([1, 2, 3]))
        assert.equal(receiver.has_ended(), true)
    } finally {
        if (!sender.has_ended()) {
            sender.abort()
        }
    }
})

test('peer abort rejects a sender waiting for a disk acknowledgement', { timeout: 5000 }, async () => {
    let release: () => void = () => undefined
    const blocked = new Promise<void>(resolve => { release = resolve })
    const { sender, receiver } = pair(1024, () => blocked, () => undefined)
    const transfer = await sender.send_offer({ name: 'abort.bin', size: 2048 })
    const sending = transfer.send(Buffer.alloc(2048))
    const rejected = assert.rejects(sending, /Session ended/)
    await setImmediate()
    receiver.abort()
    release()
    await rejected
})
