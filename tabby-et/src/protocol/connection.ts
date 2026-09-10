/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { Socket } from 'net'
import { Observable, Subject } from 'rxjs'
import { Logger } from 'tabby-core'

import { BackedReader, ETPacket } from './backedReader'
import { BackedWriter } from './backedWriter'
import { ByteReader } from './byteReader'
import { ETCrypto } from './crypto'
import { UnrecoverableSessionError } from './errors'
import {
    CLIENT_SERVER_NONCE_MSB, CONNECT_TIMEOUT, ETConnectStatus, HANDSHAKE_TIMEOUT,
    MAX_HANDSHAKE_PROTO_LENGTH, MAX_PROTO_LENGTH, PROTOCOL_VERSION,
    RECONNECT_INTERVAL, SERVER_CLIENT_NONCE_MSB,
} from './constants'
import {
    decodeCatchupBuffer, decodeConnectResponse, decodeSequenceHeader,
    encodeCatchupBuffer, encodeConnectRequest, encodeSequenceHeader,
} from './messages'

export type ETConnectionState = 'connecting'|'connected'|'reconnecting'|'ended'

export interface ETConnectionOptions {
    host: string
    port: number
    id: string
    passkey: string
    /** 0 = retry forever, matching the reference client. */
    maxReconnectAttempts: number
    /**
     * Receives one line per packet (direction, header, byte count, sequence
     * number) when debugProtocol is on. MUST only ever receive metadata -
     * payload bytes contain keystrokes and would leak passwords into logs.
     */
    debug?: (line: string) => void
}

export class ETClientConnection {
    get state$ (): Observable<ETConnectionState> { return this.stateSubject }
    get packet$ (): Observable<ETPacket> { return this.packetSubject }
    /** Emits once with a human-readable reason, then completes. */
    get ended$ (): Observable<string> { return this.endedSubject }

    state: ETConnectionState = 'connecting'

    private stateSubject = new Subject<ETConnectionState>()
    private packetSubject = new Subject<ETPacket>()
    private endedSubject = new Subject<string>()

    private socket: Socket|null = null
    private byteReader: ByteReader|null = null
    private reader: BackedReader
    private writer: BackedWriter
    private shuttingDown = false
    private reconnectAttempts = 0
    /**
     * True while connect() owns a socket that is not yet reachable through
     * `this.socket`. Nothing may start a competing handshake during that window.
     */
    private handshakeInFlight = false
    /**
     * The socket/reader of the handshake currently in flight, if any. They are
     * NOT reachable through `this.socket` until attach() runs, so shutdown()
     * needs this reference to tear them down.
     */
    private pendingHandshake: { socket: Socket, byteReader: ByteReader }|null = null

    constructor (
        private options: ETConnectionOptions,
        private logger: Logger,
    ) {
        this.reader = new BackedReader(new ETCrypto(options.passkey, SERVER_CLIENT_NONCE_MSB))
        this.writer = new BackedWriter(new ETCrypto(options.passkey, CLIENT_SERVER_NONCE_MSB))
    }

    // ---- lifecycle --------------------------------------------------------

    /** Initial connection. Throws on a fatal handshake failure. */
    async connect (): Promise<void> {
        if (this.shuttingDown) {
            throw new Error('Cannot connect: the session has already ended')
        }
        if (this.handshakeInFlight) {
            throw new Error('Cannot connect twice: a handshake is already in flight')
        }
        this.setState('connecting')
        this.handshakeInFlight = true
        let socket: Socket|null = null
        let byteReader: ByteReader|null = null
        try {
            socket = await this.openSocket()
            byteReader = new ByteReader(socket)
            // Published so shutdown() can reach the socket while the handshake is
            // still in flight - it is NOT reachable through this.socket yet.
            this.pendingHandshake = { socket, byteReader }
            const status = await this.sendConnectRequest(socket, byteReader)

            if (status === ETConnectStatus.NEW_CLIENT) {
                this.attach(socket, byteReader)
                socket = null
                byteReader = null
            } else if (status === ETConnectStatus.RETURNING_CLIENT) {
                // A live session for our id still exists on the server (e.g. the
                // protocol harness re-run, or a recovered tab racing a teardown).
                // Run the recovery exchange; a fresh process cannot serve the
                // replay range the server will request, so this fails loudly
                // instead of desynchronising the nonce counters.
                try {
                    await this.recover(socket, byteReader)
                } catch (err) {
                    throw new Error(
                        'The ET server still holds a session for these credentials, but it cannot be resumed '
                        + 'from a new process. Enable "kill other sessions" in the profile, or terminate the '
                        + `orphaned etterminal on the remote host. Underlying error: ${err}`,
                    )
                }
                this.attach(socket, byteReader)
                socket = null
                byteReader = null
            } else {
                throw new Error(this.describeStatus(status))
            }
            if (this.shuttingDown) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition -- TS cannot see shutdown() reassign it across the await
                // shutdown() raced the handshake. Attaching now would leave a live
                // socket and a 'connected' state on a session the user already
                // tore down; fail instead (the catch below destroys the socket).
                throw new Error('Connection shut down during the handshake')
            }
            this.setState('connected')
            this.runReadLoop()
        } catch (err) {
            // Nothing after openSocket() may leak the socket: a handshake read
            // timeout or a malformed frame must destroy it, or a server that
            // accepts TCP but stalls leaks one socket per attempt.
            socket?.destroy()
            byteReader?.dispose()
            throw err
        } finally {
            // Cleared only once attach() has published the socket (or the attempt
            // has failed outright), so the window this guards is exactly the one
            // where a reconnect could not see what connect() is holding.
            this.handshakeInFlight = false
            this.pendingHandshake = null
        }
    }

    /**
     * Send an encrypted packet. Buffers while disconnected.
     * Returns false if the packet had to be dropped (disconnect buffer full).
     */
    writePacket (header: number, payload: Buffer): boolean {
        if (this.shuttingDown) {
            return true
        }
        const written = this.writer.write(header, payload)
        if (!written) {
            this.logger.warn('ET write buffer is full; dropping a packet')
        }
        this.options.debug?.(`-> header=${header} bytes=${payload.length} seq=${this.writer.sequenceNumber}${written ? '' : ' DROPPED'}`)
        return written
    }

    /** Deliberately drop the TCP connection to exercise recovery. */
    forceReconnect (): void {
        this.logger.info('Forcing an ET reconnect')
        this.dropSocketAndReconnect()
    }

    shutdown (): void {
        this.shuttingDown = true
        // A handshake in flight owns a socket that shutdown() cannot see through
        // this.socket - kill it explicitly, or it lingers until CONNECT_TIMEOUT.
        this.pendingHandshake?.socket.destroy()
        this.pendingHandshake?.byteReader.dispose()
        this.pendingHandshake = null
        this.socket?.destroy()
        this.socket = null
        this.byteReader?.dispose()
        this.byteReader = null
        this.writer.detach()
        this.setState('ended')
        this.endedSubject.complete()
        this.packetSubject.complete()
        this.stateSubject.complete()
    }

    // ---- internals --------------------------------------------------------

    private setState (state: ETConnectionState): void {
        if (this.state === state) {
            return
        }
        this.state = state
        this.stateSubject.next(state)
    }

    private attach (socket: Socket, byteReader: ByteReader): void {
        this.byteReader?.dispose()
        this.socket = socket
        this.byteReader = byteReader
        this.writer.attach(socket)
        this.reader.attach(byteReader)
        this.reconnectAttempts = 0
    }

    private openSocket (): Promise<Socket> {
        return new Promise((resolve, reject) => {
            const socket = new Socket()
            socket.setNoDelay(true)
            let settled = false
            const fail = (err: Error) => {
                if (settled) {
                    return
                }
                settled = true
                socket.destroy()
                reject(err)
            }
            const timer = setTimeout(
                () => fail(new Error(`Timed out connecting to ${this.options.host}:${this.options.port}`)),
                CONNECT_TIMEOUT,
            )
            socket.once('error', fail)
            socket.connect(this.options.port, this.options.host, () => {
                if (settled) {
                    return
                }
                settled = true
                clearTimeout(timer)
                socket.removeListener('error', fail)
                resolve(socket)
            })
        })
    }

    /** Framing A: 8-byte little-endian length + protobuf. */
    private async writeProto (socket: Socket, message: Buffer): Promise<void> {
        const header = Buffer.allocUnsafe(8)
        header.writeBigInt64LE(BigInt(message.length), 0)
        socket.write(header)
        if (message.length) {
            socket.write(message)
        }
    }

    private async readProto (reader: ByteReader, maxLength = MAX_PROTO_LENGTH): Promise<Buffer> {
        const header = await reader.read(8, HANDSHAKE_TIMEOUT)
        const length = Number(header.readBigInt64LE(0))
        if (length < 0 || length > maxLength) {
            throw new Error(`Invalid ET handshake message length ${length}`)
        }
        // A zero-length frame is legal and means "default-constructed message".
        return length === 0 ? Buffer.alloc(0) : reader.read(length, HANDSHAKE_TIMEOUT)
    }

    private async sendConnectRequest (socket: Socket, reader: ByteReader): Promise<number> {
        await this.writeProto(socket, encodeConnectRequest(this.options.id, PROTOCOL_VERSION))
        const response = decodeConnectResponse(await this.readProto(reader, MAX_HANDSHAKE_PROTO_LENGTH))
        if (response.error) {
            this.logger.info(`etserver said: ${response.error}`)
        }
        return response.status ?? 0
    }

    private describeStatus (status: number): string {
        switch (status) {
            case ETConnectStatus.INVALID_KEY:
                return 'The ET server rejected our session key. The remote session has ended.'
            case ETConnectStatus.MISMATCHED_PROTOCOL:
                return `Protocol version mismatch: Tabby speaks ET protocol ${PROTOCOL_VERSION}. Upgrade or downgrade the remote etserver so both sides match.`
            default:
                return `The ET server refused the connection (status ${status})`
        }
    }

    private async runReadLoop (): Promise<void> {
        try {
            for (;;) {
                const packet = await this.reader.read()
                this.options.debug?.(`<- header=${packet.header} bytes=${packet.payload.length} seq=${this.reader.sequenceNumber}`)
                this.packetSubject.next(packet)
            }
        } catch (err) {
            if (this.shuttingDown) {
                return
            }
            if (err instanceof UnrecoverableSessionError) {
                // A Poly1305 failure, not a socket failure. Reconnecting cannot
                // recover the packet and, if the counters are genuinely out of
                // step, would reconnect-and-fail on every subsequent packet
                // forever (each success resets reconnectAttempts, so the attempt
                // cap never trips). Stop, and say why.
                this.logger.error(`ET stream integrity failure: ${err.message}`)
                this.end(`The encrypted session stream failed its integrity check: ${err.message}`)
                return
            }
            this.logger.info(`ET read loop stopped: ${err}`)
            this.dropSocketAndReconnect()
        }
    }

    private dropSocketAndReconnect (): void {
        if (this.shuttingDown || this.state === 'reconnecting') {
            return
        }
        if (this.handshakeInFlight) {
            // connect() is mid-handshake on a socket we cannot see yet. Starting
            // a reconnect now would run a SECOND concurrent handshake for the
            // same session id: both would attach, and the two nonce streams would
            // diverge immediately. The in-flight handshake has its own timeout.
            this.logger.info('Ignoring a reconnect request made during the initial handshake')
            return
        }
        this.socket?.destroy()
        this.socket = null
        this.byteReader?.dispose()
        this.byteReader = null
        this.writer.detach()
        this.setState('reconnecting')
        void this.reconnectLoop()
    }

    private async reconnectLoop (): Promise<void> {
        for (;;) {
            if (this.shuttingDown) {
                return
            }
            await new Promise(resolve => setTimeout(resolve, RECONNECT_INTERVAL))
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (this.shuttingDown) {
                return
            }
            this.reconnectAttempts++
            let socket: Socket|null = null
            let byteReader: ByteReader|null = null
            // EVERY path out of an attempt must release the attempt's socket and
            // reader, or a server that answers but never resumes leaks one file
            // descriptor per second, forever. Registering them as the pending
            // handshake also lets shutdown() reach them mid-attempt.
            const release = () => {
                socket?.destroy()
                byteReader?.dispose()
                socket = null
                byteReader = null
                this.pendingHandshake = null
            }
            try {
                socket = await this.openSocket()
                byteReader = new ByteReader(socket)
                this.pendingHandshake = { socket, byteReader }
                const status = await this.sendConnectRequest(socket, byteReader)

                if (status === ETConnectStatus.INVALID_KEY) {
                    // The only way the client learns the remote shell has exited.
                    release()
                    this.end('Session terminated by the server')
                    return
                }
                if (status === ETConnectStatus.MISMATCHED_PROTOCOL) {
                    // The etserver was upgraded or replaced under us. Permanent.
                    release()
                    this.end(this.describeStatus(status))
                    return
                }
                if (status === ETConnectStatus.NEW_CLIENT) {
                    // The server has no memory of our session, so it just created
                    // a blank one with no shell behind it. Our sequence numbers
                    // and nonces are meaningless to it; attaching would desync at
                    // the first packet. Permanent.
                    release()
                    this.end('The ET server no longer has this session. The remote shell has ended or etserver was restarted.')
                    return
                }
                if (status !== ETConnectStatus.RETURNING_CLIENT) {
                    release()
                    this.logger.warn(`Unexpected reconnect status ${status}; retrying`)
                    continue
                }

                await this.recover(socket, byteReader)
                this.attach(socket, byteReader)
                socket = null
                byteReader = null
                this.setState('connected')
                this.runReadLoop()
                return
            } catch (err) {
                release()
                this.logger.debug(`ET reconnect attempt ${this.reconnectAttempts} failed: ${err}`)
                if (err instanceof UnrecoverableSessionError) {
                    // Retrying cannot fix this - the replay range is gone for
                    // good, so every further attempt would fail identically and
                    // leave the tab wedged on "reconnecting" forever.
                    this.end(`The session cannot be resumed: ${err.message}`)
                    return
                }
                if (this.options.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.options.maxReconnectAttempts) {
                    this.end(`Could not resume the session after ${this.reconnectAttempts} attempts`)
                    return
                }
            }
        }
    }

    /**
     * Symmetric catch-up exchange. Order matters and must be:
     *   write SequenceHeader -> read SequenceHeader -> write CatchupBuffer -> read CatchupBuffer
     * Both peers write before reading, so this cannot deadlock.
     * Every read carries HANDSHAKE_TIMEOUT (via readProto), so a server that
     * stalls mid-recovery rejects instead of wedging us in 'reconnecting'.
     */
    private async recover (socket: Socket, byteReader: ByteReader): Promise<void> {
        await this.writeProto(socket, encodeSequenceHeader(this.reader.sequenceNumber))

        const remoteSequence = decodeSequenceHeader(
            await this.readProto(byteReader, MAX_HANDSHAKE_PROTO_LENGTH),
        )

        const toSend = this.writer.recover(remoteSequence)
        await this.writeProto(socket, encodeCatchupBuffer(toSend))

        const recovered = decodeCatchupBuffer(await this.readProto(byteReader))

        this.reader.revive(byteReader, recovered)
        this.writer.attach(socket)

        this.logger.info(`ET session resumed: replayed ${toSend.length} out, ${recovered.length} in`)
    }

    private end (reason: string): void {
        this.shuttingDown = true
        this.socket?.destroy()
        this.socket = null
        this.byteReader?.dispose()
        this.byteReader = null
        this.writer.detach()
        this.setState('ended')
        this.endedSubject.next(reason)
        this.endedSubject.complete()
    }
}
