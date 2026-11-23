import { Socket } from 'net'
import { Subscription, Observable } from 'rxjs'
import type { Channel } from 'russh'
import type { Logger } from 'tabby-core'

/** Preserve byte ordering and half-closes across the async native channel API. */
export function bridgeSocketToChannel (
    channel: Pick<Channel, 'write'|'eof'|'close'|'data$'|'eof$'|'closed$'>,
    socket: Socket,
    logger: Pick<Logger, 'error'>,
    logPrefix: string,
    sessionClosing: Observable<void>,
): void {
    const subscriptions = new Subscription()
    const state = { stopped: false, channelClosed: false, channelCloseSent: false, remoteEnded: false, localEnded: false }
    let writing = Promise.resolve()

    const closeChannel = () => {
        if (state.channelClosed || state.channelCloseSent) {
            return
        }
        state.channelCloseSent = true
        channel.close().catch(error => logger.error(`${logPrefix}: could not close channel`, error))
    }
    const fail = (error: unknown) => {
        if (state.stopped || state.channelClosed) {
            return
        }
        state.stopped = true
        logger.error(`${logPrefix}: forwarding failed`, error)
        subscriptions.unsubscribe()
        socket.destroy()
    }
    const onError = (error: Error) => fail(error)
    const onData = (data: Buffer) => {
        socket.pause()
        writing = writing.then(async () => {
            if (!state.stopped && !state.channelClosed) {
                await channel.write(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
            }
        }).then(() => {
            if (!state.stopped && !state.channelClosed && !state.localEnded) {
                socket.resume()
            }
        }).catch(fail)
    }
    const onEnd = () => {
        state.localEnded = true
        // EOF must follow every write, including the last pending native request.
        writing = writing.then(async () => {
            if (!state.stopped && !state.channelClosed) {
                await channel.eof()
            }
        }).catch(fail)
    }
    const onFinish = () => {
        if (state.channelClosed) {
            socket.destroy()
        }
    }

    const onClose = () => {
        state.stopped = true
        subscriptions.unsubscribe()
        socket.off('data', onData)
        socket.off('end', onEnd)
        socket.off('error', onError)
        socket.off('finish', onFinish)
        socket.off('close', onClose)
        closeChannel()
    }

    // One side may stop sending while it still expects a response.
    socket.allowHalfOpen = true
    socket.pause()
    socket.on('error', onError)
    socket.on('close', onClose)
    socket.on('end', onEnd)
    socket.on('finish', onFinish)
    socket.on('data', onData)

    subscriptions.add(channel.data$.subscribe({
        next: data => {
            if (!state.stopped && !state.remoteEnded && !state.channelClosed && !socket.writableEnded) {
                socket.write(data)
            }
        },
        error: fail,
    }))
    subscriptions.add(channel.eof$.subscribe(() => {
        state.remoteEnded = true
        if (!state.stopped && !socket.writableEnded) {
            socket.end()
        }
    }))
    subscriptions.add(channel.closed$.subscribe(() => {
        state.channelClosed = true
        socket.pause()
        // end() flushes queued output; destroy() here would discard it.
        if (!socket.writableEnded) {
            socket.end()
        }
        if (socket.writableFinished) {
            socket.destroy()
        }
    }))
    subscriptions.add(sessionClosing.subscribe(() => {
        state.stopped = true
        // The SSH connection is closing all its channels itself.
        state.channelClosed = true
        subscriptions.unsubscribe()
        socket.destroy()
    }))
    if (!state.stopped && !state.channelClosed) {
        socket.resume()
    }
}
