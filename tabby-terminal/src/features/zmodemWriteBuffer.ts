const WRITE_BATCH_SIZE = 128 * 1024
// Caps the memory a session may hold while the disk lags behind the link, so
// a stalled download fails instead of growing without bound. Senders that
// honour the advertised receive window wait for each ZACK and never approach
// it; only a sender that ignores the window (lrzsz 0.12.20, as shipped by most
// distributions) streams nonstop, and for it the cap has to outlast a disk
// stall of a few seconds on a fast link rather than cancel the download.
const MAX_BUFFERED_BYTES = 64 * 1024 * 1024

/** Shared across files, including files still finishing after their wire EOF. */
export class ZModemWriteBudget {
    bufferedBytes = 0

    constructor (private limit = MAX_BUFFERED_BYTES) { }

    reserve (bytes: number): void {
        if (bytes > this.limit - this.bufferedBytes) {
            throw new Error('ZMODEM download cancelled: disk writes cannot keep up with incoming data')
        }
        this.bufferedBytes += bytes
    }

    release (bytes: number): void {
        this.bufferedBytes -= bytes
    }
}

interface WriteBatch {
    data: Buffer
    capacity: number
}

/** A bounded, batched sink for zmodem.js' synchronous on_input callback. */
export class ZModemWriteBuffer {
    readonly failed: Promise<never>
    private rejectFailed: (error: Error) => void
    private error?: Error
    private ended = false
    private partial?: Buffer
    private partialLength = 0
    private queue: WriteBatch[] = []
    private draining?: Promise<void>

    constructor (
        private write: (data: Uint8Array) => Promise<void>,
        private budget: ZModemWriteBudget,
        private batchSize = WRITE_BATCH_SIZE,
    ) {
        this.failed = new Promise((_resolve, reject) => { this.rejectFailed = reject })
        // A sink may fail before the caller has installed its Promise.race.
        this.failed.catch(() => undefined)
    }

    push (chunk: Uint8Array|number[]): void {
        this.throwIfFailed()
        if (this.ended) {
            throw new Error('ZMODEM download is already finished')
        }
        let offset = 0
        while (offset < chunk.length) {
            this.throwIfFailed()
            if (!this.partial) {
                this.budget.reserve(this.batchSize)
                this.partial = Buffer.allocUnsafe(this.batchSize)
            }
            const count = Math.min(chunk.length - offset, this.batchSize - this.partialLength)
            const data = Array.isArray(chunk) ? chunk.slice(offset, offset + count) : chunk.subarray(offset, offset + count)
            this.partial.set(data, this.partialLength)
            this.partialLength += count
            offset += count
            if (this.partialLength === this.batchSize) {
                this.enqueuePartial()
            }
        }
    }

    async finish (): Promise<void> {
        this.ended = true
        await this.flush()
    }

    async flush (): Promise<void> {
        this.throwIfFailed()
        if (this.partial) {
            this.enqueuePartial()
        }
        await this.draining
        this.throwIfFailed()
    }

    abort (error: unknown): void {
        if (this.error) {
            return
        }
        this.error = error instanceof Error ? error : new Error(String(error))
        if (this.partial) {
            this.budget.release(this.batchSize)
            this.partial = undefined
            this.partialLength = 0
        }
        for (const batch of this.queue) {
            this.budget.release(batch.capacity)
        }
        this.queue = []
        this.rejectFailed(this.error)
    }

    private enqueuePartial (): void {
        this.queue.push({ data: this.partial!.subarray(0, this.partialLength), capacity: this.batchSize })
        this.partial = undefined
        this.partialLength = 0
        this.draining ??= this.drain()
    }

    private throwIfFailed (): void {
        if (this.error) {
            throw this.error
        }
    }

    private async drain (): Promise<void> {
        while (this.queue.length && !this.error) {
            const batch = this.queue.shift()!
            try {
                await this.write(batch.data)
            } catch (error) {
                this.abort(error)
            } finally {
                this.budget.release(batch.capacity)
            }
        }
        this.draining = undefined
    }
}
