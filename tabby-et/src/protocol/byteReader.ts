import { Socket } from 'net'

/**
 * Flow-control thresholds for the unread backlog. Reads are driven by a single
 * async loop, so a peer that writes faster than we parse would otherwise grow
 * `buffer` without bound.
 */
const HIGH_WATER_MARK = 8 * 1024 * 1024
const LOW_WATER_MARK = 2 * 1024 * 1024

/**
 * Pull-based reader over a net.Socket.
 *
 * One ByteReader belongs to exactly one socket. When the socket dies, every pending
 * and future read rejects - which is how the packet read loop learns to stop.
 */
export class ByteReader {
    private buffer: Buffer = Buffer.alloc(0)
    private waiter: { size: number, timer: any, resolve: (b: Buffer) => void, reject: (e: Error) => void }|null = null
    private failure: Error|null = null
    private paused = false
    private disposed = false

    constructor (private socket: Socket) {
        socket.on('data', data => this.onData(data))
        socket.on('error', err => this.fail(err))
        socket.on('close', () => this.fail(new Error('Connection closed')))
        socket.on('end', () => this.fail(new Error('Connection ended by remote')))
    }

    private onData (data: Buffer): void {
        this.buffer = this.buffer.length ? Buffer.concat([this.buffer, data]) : data
        this.pump()
        this.updateFlow()
    }

    private pump (): void {
        if (this.waiter && this.buffer.length >= this.waiter.size) {
            const { size, resolve } = this.waiter
            this.clearTimer()
            this.waiter = null
            const out = this.buffer.subarray(0, size)
            this.buffer = this.buffer.subarray(size)
            resolve(out)
        }
    }

    /**
     * Pause the socket once the unread backlog gets large, resume once it drains.
     *
     * Never pauses while a pending read still needs more bytes than we hold: a
     * legitimate frame (a catch-up buffer, say) may be larger than the high-water
     * mark, and pausing then would deadlock that read against its own timeout.
     */
    private updateFlow (): void {
        if (this.failure) {
            return
        }
        const starved = this.buffer.length < (this.waiter?.size ?? 0)
        if (!this.paused && !starved && this.buffer.length >= HIGH_WATER_MARK) {
            this.paused = true
            this.socket.pause()
        } else if (this.paused && (starved || this.buffer.length <= LOW_WATER_MARK)) {
            this.paused = false
            this.socket.resume()
        }
    }

    private fail (err: Error): void {
        if (this.failure) {
            return
        }
        this.failure = err
        const w = this.waiter
        this.waiter = null
        // The timer must die with the waiter, or it keeps the event loop (and a
        // doomed reject closure) alive for its full duration.
        if (w?.timer) {
            clearTimeout(w.timer)
        }
        w?.reject(err)
    }

    private clearTimer (): void {
        if (this.waiter?.timer) {
            clearTimeout(this.waiter.timer)
        }
    }

    /** Read exactly `size` bytes. Rejects on socket failure or timeout. */
    read (size: number, timeoutMs?: number): Promise<Buffer> {
        if (this.disposed) {
            // dispose() is authoritative: no reads after it, even from data that
            // is still buffered. (A socket FAILURE is different - buffered bytes
            // were genuinely received and stay readable until drained.)
            return Promise.reject(this.failure ?? new Error('Reader disposed'))
        }
        if (size === 0) {
            return Promise.resolve(Buffer.alloc(0))
        }
        if (this.buffer.length >= size) {
            const out = this.buffer.subarray(0, size)
            this.buffer = this.buffer.subarray(size)
            this.updateFlow()
            return Promise.resolve(out)
        }
        if (this.failure) {
            return Promise.reject(this.failure)
        }
        if (this.waiter) {
            return Promise.reject(new Error('ByteReader: concurrent reads are not supported'))
        }
        return new Promise<Buffer>((resolve, reject) => {
            this.waiter = {
                size,
                timer: null,
                resolve: b => {
                    this.clearTimer()
                    resolve(b)
                },
                reject: e => {
                    this.clearTimer()
                    reject(e)
                },
            }
            if (timeoutMs) {
                // A timed-out read does not consume the buffer: the bytes (if any
                // ever arrive) stay available to a later read, and the timeout
                // does not tear the socket down. Callers decide what a timeout
                // means for the connection.
                this.waiter.timer = setTimeout(() => {
                    const w = this.waiter
                    this.waiter = null
                    w?.reject(new Error(`Timed out waiting for ${size} bytes from the ET server`))
                }, timeoutMs)
            }
            // This read may need more than the high-water mark (a large catch-up
            // buffer), so re-evaluate flow control now that a waiter exists.
            this.updateFlow()
        })
    }

    dispose (): void {
        this.disposed = true
        this.fail(new Error('Reader disposed'))
    }
}
