import type { FileTransfer } from 'tabby-core'

/**
 * russh-sftp gives every request a fixed deadline, so a stalled or slow link
 * fails with a timeout even though the SSH session itself is still alive.
 * The binding reports it either as an `io::Error` (file reads and writes) or
 * as the bare SFTP error (everything else).
 */
export function isSFTPTimeout (error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return /\bTimedOut\b|^Timeout$/.test(message)
}

export interface SFTPRetryPolicy {
    /** Consecutive timeouts without progress before the transfer gives up. */
    maxAttempts: number
    delay: (attempt: number) => number
}

export const DEFAULT_SFTP_RETRY_POLICY: SFTPRetryPolicy = {
    maxAttempts: 8,
    delay: attempt => Math.min(1000 * 2 ** (attempt - 1), 15000),
}

/**
 * Bytes of upload data kept after it was handed to the server. russh-sftp
 * pipelines at most 16 writes of 32 KiB, so anything older is acknowledged.
 */
const UPLOAD_RESEND_WINDOW = 4 * 1024 * 1024

export interface SFTPReadableFile {
    read: () => Promise<Uint8Array>
    close: () => Promise<void>
}

export interface SFTPWritableFile {
    write: (chunk: Uint8Array) => Promise<void>
    close: () => Promise<void>
}

export interface SFTPUploadTarget {
    /** Opens the file for writing, truncating it unless `append` is set. */
    open: (append: boolean) => Promise<SFTPWritableFile>
    size: () => Promise<number>
}

interface TransferControl {
    isCancelled: FileTransfer['isCancelled']
    setStatus: FileTransfer['setStatus']
}

interface TimeoutRetry {
    /** Call once data has moved past the point where the transfer last failed. */
    progressed: () => void
    /** Waits before the next attempt, or rethrows if the error is not worth retrying. */
    backoff: (error: unknown) => Promise<void>
    run: <T>(operation: () => Promise<T>) => Promise<T>
}

function createTimeoutRetry (transfer: TransferControl, policy: SFTPRetryPolicy): TimeoutRetry {
    let attempts = 0

    const backoff = async (error: unknown) => {
        if (!isSFTPTimeout(error) || transfer.isCancelled() || attempts >= policy.maxAttempts) {
            throw error
        }
        attempts++
        transfer.setStatus(`Network timeout, retrying ${attempts}/${policy.maxAttempts}`)
        await new Promise(resolve => setTimeout(resolve, policy.delay(attempts)))
        if (transfer.isCancelled()) {
            throw error
        }
    }

    return {
        progressed: () => {
            if (attempts) {
                attempts = 0
                transfer.setStatus('')
            }
        },
        backoff,
        run: async operation => {
            while (true) {
                try {
                    return await operation()
                } catch (error) {
                    await backoff(error)
                }
            }
        },
    }
}

function dropBefore (chunks: Uint8Array[], bytes: number): Uint8Array[] {
    const result: Uint8Array[] = []
    for (const chunk of chunks) {
        if (bytes >= chunk.length) {
            bytes -= chunk.length
            continue
        }
        result.push(bytes ? chunk.subarray(bytes) : chunk)
        bytes = 0
    }
    return result
}

/**
 * A timed out read leaves the russh-sftp file positioned at the failed
 * offset, so reading the same handle again resumes without losing data.
 */
export async function downloadWithRetry (
    open: () => Promise<SFTPReadableFile>,
    transfer: TransferControl & { write: (chunk: Uint8Array) => Promise<void> },
    policy = DEFAULT_SFTP_RETRY_POLICY,
): Promise<void> {
    const retry = createTimeoutRetry(transfer, policy)
    const file = await retry.run(open)
    while (true) {
        const chunk = await retry.run(() => file.read())
        retry.progressed()
        if (!chunk.length) {
            break
        }
        await transfer.write(chunk)
    }
    file.close().catch(() => null)
}

/**
 * A failed write may leave earlier pipelined writes unacknowledged, so after
 * a timeout the upload asks the server how much of the file it has and
 * appends the rest from a reopened handle. Servers apply requests in order,
 * so by the time the size is reported every earlier write has landed.
 */
export async function uploadWithRetry (
    target: SFTPUploadTarget,
    transfer: TransferControl & { read: () => Promise<Uint8Array> },
    policy = DEFAULT_SFTP_RETRY_POLICY,
): Promise<void> {
    const retry = createTimeoutRetry(transfer, policy)
    // Data handed to the server that may not have landed yet, starting at `pendingStart`
    let pending: Uint8Array[] = []
    let pendingStart = 0
    let sent = 0
    let confirmed = 0
    let eof = false
    let opened = false
    let file: SFTPWritableFile|null = null

    while (true) {
        try {
            if (!file && !opened) {
                file = await target.open(false)
                opened = true
            }
            if (!file) {
                const size = await target.size()
                if (size < pendingStart || size > sent) {
                    throw new Error(`Cannot resume upload: remote file has ${size} bytes, expected ${pendingStart}-${sent}`)
                }
                if (size > confirmed) {
                    confirmed = size
                    retry.progressed()
                }
                pending = dropBefore(pending, size - pendingStart)
                pendingStart = size
                if (eof && size === sent) {
                    return
                }
                file = await target.open(true)
                for (const chunk of pending) {
                    await file.write(chunk)
                }
                transfer.setStatus('')
            }

            if (eof) {
                await file.close()
                return
            }
            const chunk = await transfer.read()
            if (!chunk.length) {
                eof = true
                continue
            }
            pending.push(chunk)
            sent += chunk.length
            while (pending.length > 1 && sent - pendingStart - pending[0].length >= UPLOAD_RESEND_WINDOW) {
                pendingStart += pending.shift()!.length
            }
            await file.write(chunk)
        } catch (error) {
            file?.close().catch(() => null)
            file = null
            await retry.backoff(error)
        }
    }
}
