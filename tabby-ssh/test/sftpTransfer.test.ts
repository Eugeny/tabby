import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { downloadWithRetry, isSFTPTimeout, uploadWithRetry, type SFTPRetryPolicy, type SFTPWritableFile } from '../src/session/sftpTransfer.ts'

const IO_TIMEOUT = 'Custom { kind: TimedOut, error: Timeout }'
const noDelay: SFTPRetryPolicy = { maxAttempts: 3, delay: () => 0 }

class FakeTransfer {
    readonly statuses: string[] = []
    readonly received: number[] = []
    cancelled = false
    private source: number[][]

    constructor (source: number[][] = []) {
        this.source = source
    }

    isCancelled (): boolean { return this.cancelled }
    setStatus (status: string): void { this.statuses.push(status) }
    async write (chunk: Uint8Array): Promise<void> { this.received.push(...chunk) }
    async read (): Promise<Uint8Array> { return new Uint8Array(this.source.shift() ?? []) }
}

/** Mirrors the server side: writes land in order, possibly after the client gave up on them. */
class FakeUploadTarget {
    data: number[] = []
    readonly opens: boolean[] = []
    failWrites: number[] = []
    private writes = 0

    async open (append: boolean): Promise<SFTPWritableFile> {
        this.opens.push(append)
        if (!append) {
            this.data = []
        }
        return {
            write: async chunk => {
                this.data.push(...chunk)
                if (this.failWrites.includes(this.writes++)) {
                    throw new Error(IO_TIMEOUT)
                }
            },
            close: async () => undefined,
        }
    }

    async size (): Promise<number> { return this.data.length }
}

describe('SFTP timeout detection', () => {
    it('recognises the io and bare SFTP timeout errors only', () => {
        assert.equal(isSFTPTimeout(new Error(IO_TIMEOUT)), true)
        assert.equal(isSFTPTimeout(new Error('Timeout')), true)
        assert.equal(isSFTPTimeout(new Error('UnexpectedBehavior("session closed")')), false)
        assert.equal(isSFTPTimeout(new Error('ETIMEDOUT: connection timed out')), false)
    })
})

describe('SFTP download retries', () => {
    it('re-reads the same handle after a timeout without losing data', async () => {
        const reads: (number[]|Error)[] = [[1, 2], new Error(IO_TIMEOUT), new Error(IO_TIMEOUT), [3], []]
        const transfer = new FakeTransfer()
        let opens = 0

        await downloadWithRetry(async () => {
            opens++
            return {
                read: async () => {
                    const next = reads.shift()!
                    if (next instanceof Error) {
                        throw next
                    }
                    return new Uint8Array(next)
                },
                close: async () => undefined,
            }
        }, transfer, noDelay)

        assert.equal(opens, 1)
        assert.deepEqual(transfer.received, [1, 2, 3])
        assert.deepEqual(transfer.statuses, ['Network timeout, retrying 1/3', 'Network timeout, retrying 2/3', ''])
    })

    it('gives up after the allowed number of timeouts without progress', async () => {
        const transfer = new FakeTransfer()
        const download = downloadWithRetry(async () => ({
            read: async () => { throw new Error(IO_TIMEOUT) },
            close: async () => undefined,
        }), transfer, noDelay)

        await assert.rejects(download, { message: IO_TIMEOUT })
        assert.equal(transfer.statuses.length, 3)
    })

    it('does not retry other errors or cancelled transfers', async () => {
        const failing = { read: async (): Promise<Uint8Array> => { throw new Error('ConnectionLost') }, close: async () => undefined }
        await assert.rejects(downloadWithRetry(async () => failing, new FakeTransfer(), noDelay), { message: 'ConnectionLost' })

        const cancelled = new FakeTransfer()
        cancelled.cancelled = true
        const timingOut = { read: async (): Promise<Uint8Array> => { throw new Error(IO_TIMEOUT) }, close: async () => undefined }
        await assert.rejects(downloadWithRetry(async () => timingOut, cancelled, noDelay), { message: IO_TIMEOUT })
        assert.deepEqual(cancelled.statuses, [])
    })
})

describe('SFTP upload retries', () => {
    it('appends from the size the server reports after a timeout', async () => {
        const target = new FakeUploadTarget()
        // The second write reaches the server but its acknowledgement times out
        target.failWrites = [1]
        const transfer = new FakeTransfer([[1, 2], [3, 4], [5, 6]])

        await uploadWithRetry(target, transfer, noDelay)

        assert.deepEqual(target.data, [1, 2, 3, 4, 5, 6])
        assert.deepEqual(target.opens, [false, true])
    })

    it('resends data the server had not applied yet', async () => {
        const target = new FakeUploadTarget()
        const write = target.open.bind(target)
        target.open = async append => {
            const file = await write(append)
            return {
                write: async chunk => {
                    if (!append && chunk[0] === 3) {
                        throw new Error(IO_TIMEOUT)
                    }
                    await file.write(chunk)
                },
                close: file.close,
            }
        }
        const transfer = new FakeTransfer([[1, 2], [3, 4], [5, 6]])

        await uploadWithRetry(target, transfer, noDelay)

        assert.deepEqual(target.data, [1, 2, 3, 4, 5, 6])
    })

    it('finishes without reopening when only the final close timed out', async () => {
        const target = new FakeUploadTarget()
        const open = target.open.bind(target)
        target.open = async append => ({
            ...await open(append),
            close: async () => { throw new Error(IO_TIMEOUT) },
        })

        await uploadWithRetry(target, new FakeTransfer([[1, 2]]), noDelay)

        assert.deepEqual(target.data, [1, 2])
        assert.deepEqual(target.opens, [false])
    })

    it('refuses to resume when the remote file no longer matches', async () => {
        const target = new FakeUploadTarget()
        target.failWrites = [0]
        target.size = async () => 99

        await assert.rejects(
            uploadWithRetry(target, new FakeTransfer([[1, 2]]), noDelay),
            /Cannot resume upload/,
        )
    })
})
