import { Injector } from '@angular/core'
import colors from 'ansi-colors'
import { Socket } from 'net'
import { Observable, ReplaySubject, Subject } from 'rxjs'
import stripAnsi from 'strip-ansi'
import { ConfigService, LogService } from 'tabby-core'
import { BaseSession, InputProcessor, UTF8SplitterMiddleware } from 'tabby-terminal'
import { KeyboardInteractivePrompt, SSHSession } from 'tabby-ssh'

import { ETProfile } from '../api/interfaces'
import { ETClientConnection, ETConnectionState } from '../protocol/connection'
import {
    ETPacketType, INITIAL_RESPONSE_TIMEOUT, PING_TIMEOUT, TERMINAL_CHUNK_SIZE,
} from '../protocol/constants'
import {
    decodeInitialResponse, decodeTerminalBuffer, encodeInitialPayload,
    encodeTerminalBuffer, encodeTerminalInfo,
} from '../protocol/messages'
import { ETBootstrap } from './bootstrap'
import { ETPortForwardHandler } from './portForwarding'

export class ETSession extends BaseSession {
    get serviceMessage$ (): Observable<string> { return this.serviceMessage }
    get keyboardInteractivePrompt$ (): Observable<KeyboardInteractivePrompt> { return this.kiPrompt }
    get connectionState$ (): Observable<ETConnectionState> { return this.connectionStateSubject }
    /** The bootstrap SSH session, needed by the keyboard-interactive panel. */
    get bootstrapSession$ (): Observable<SSHSession> { return this.bootstrapSession }

    connectionState: ETConnectionState = 'connecting'
    forwards: ETPortForwardHandler

    private serviceMessage = new Subject<string>()
    private kiPrompt = new Subject<KeyboardInteractivePrompt>()
    private connectionStateSubject = new Subject<ETConnectionState>()
    private bootstrapSession = new ReplaySubject<SSHSession>(1)

    private connection: ETClientConnection|null = null
    private bootstrap: ETBootstrap|null = null
    private keepaliveTimer: any = null
    private awaitingKeepalive = false
    /** When we last saw INBOUND traffic. Outbound writes deliberately do not count. */
    private lastInboundAt = 0
    private lastSize = { columns: 0, rows: 0 }
    private initialResponse: { resolve: () => void, reject: (e: Error) => void }|null = null
    private droppedInputSinceReconnect = false

    constructor (
        private injector: Injector,
        public profile: ETProfile,
    ) {
        super(injector.get(LogService).create(`et-${profile.options.host}`))
        this.setLoginScriptsOptions(profile.options)
        this.middleware.push(new UTF8SplitterMiddleware())
        this.middleware.push(new InputProcessor(profile.options.input))

        this.forwards = new ETPortForwardHandler(
            this.logger,
            // The boolean matters here: a dropped PORT_FORWARD_DATA packet would
            // silently corrupt a tunnelled byte stream, so the handler needs to
            // know. No connection at all counts as a drop.
            (header, payload) => this.connection?.writePacket(header, payload) ?? false,
            msg => this.emitServiceMessage(msg),
        )
    }

    // ---- lifecycle --------------------------------------------------------

    async start (): Promise<void> {
        const o = this.profile.options

        // 3 (computed early). With an ET-native jump host the destination may not
        // accept direct TCP at all, so we probe whatever we will actually connect to.
        const target = o.jumpHost
            ? { host: o.jumpHost, port: o.jumpPort }
            : { host: o.host, port: o.port }

        // 1. Fail fast if etserver is unreachable, exactly as `et` does.
        await this.ping(target.host, target.port)

        // 2. Bootstrap over SSH.
        this.emitServiceMessage(colors.bgBlue.black(' SSH ') + ' Starting the remote session')
        this.bootstrap = new ETBootstrap(this.injector, this.profile)
        this.bootstrap.sshSessionCreated$.subscribe(s => {
            this.bootstrapSession.next(s)
            s.serviceMessage$.subscribe(m => this.emitServiceMessage(m))
            s.keyboardInteractivePrompt$.subscribe(p => this.kiPrompt.next(p))
        })

        let credentials = await this.bootstrap.run()

        // 2b. ET-native jump host: bootstrap the jump host with the same credentials.
        if (o.jumpHost) {
            this.emitServiceMessage(colors.bgBlue.black(' JUMP ') + ` Preparing ${o.jumpHost}`)
            credentials = await this.bootstrap.run({
                credentials,
                jumpTo: { host: o.host, port: o.port },
            })
        }

        this.connection = new ETClientConnection({
            host: target.host,
            port: target.port,
            id: credentials.id,
            passkey: credentials.passkey,
            maxReconnectAttempts: o.maxReconnectAttempts,
            // debugProtocol logs metadata only (header/length/sequence number);
            // payload bytes contain keystrokes and must never reach the log.
            debug: this.injector.get(ConfigService).store.et.debugProtocol
                ? line => this.logger.info(`[et-proto] ${line}`)
                : undefined,
        }, this.logger)

        this.connection.packet$.subscribe(p => this.handlePacket(p.header, p.payload))
        this.connection.state$.subscribe(s => this.onConnectionState(s))
        this.connection.ended$.subscribe(reason => {
            this.emitServiceMessage(colors.bgRed.black(' X ') + ` ${reason}`)
            this.destroy()
        })

        await this.connection.connect()

        // 4. INITIAL_PAYLOAD / INITIAL_RESPONSE.
        await this.sendInitialPayload()

        // 5. Local listeners for forward tunnels.
        await this.forwards.startLocalForwards(o.forwardedPorts)

        // 6. Go live.
        this.open = true
        this.connectionState = 'connected'
        this.sendTerminalInfo()
        this.startKeepalive()
        this.loginScriptProcessor?.executeUnconditionalScripts()
    }

    private ping (host: string, port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const socket = new Socket()
            const fail = () => {
                socket.destroy()
                reject(new Error(
                    `Could not reach the ET server at ${host}:${port}. `
                    + 'Check that etserver is running and the port is open.',
                ))
            }
            socket.setTimeout(PING_TIMEOUT)
            socket.once('timeout', fail)
            socket.once('error', fail)
            socket.connect(port, host, () => {
                socket.destroy()
                resolve()
            })
        })
    }

    private sendInitialPayload (): Promise<void> {
        const o = this.profile.options
        const payload = encodeInitialPayload({
            jumphost: !!o.jumpHost,
            reverseTunnels: this.forwards.buildReverseTunnelRequests(o),
            environmentVariables: o.environmentVariables,
        })

        const promise = new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.initialResponse = null
                reject(new Error('The ET server did not acknowledge the session'))
            }, INITIAL_RESPONSE_TIMEOUT)
            // The settle callbacks own the timer: a late INITIAL_RESPONSE after
            // timeout must not reject an already-failed start(), and the timer
            // must not outlive the wait.
            this.initialResponse = {
                resolve: () => {
                    clearTimeout(timer)
                    this.initialResponse = null
                    resolve()
                },
                reject: err => {
                    clearTimeout(timer)
                    this.initialResponse = null
                    reject(err)
                },
            }
        })
        this.connection!.writePacket(ETPacketType.INITIAL_PAYLOAD, payload)
        return promise
    }

    // ---- packet routing ---------------------------------------------------

    private handlePacket (header: number, payload: Buffer): void {
        // ET resets its keepalive timer on ANY inbound traffic.
        this.noteInboundTraffic()
        try {
            switch (header) {
                case ETPacketType.TERMINAL_BUFFER:
                    this.emitOutput(decodeTerminalBuffer(payload))
                    break

                case ETPacketType.KEEP_ALIVE:
                    break

                case ETPacketType.INITIAL_RESPONSE: {
                    const response = decodeInitialResponse(payload)
                    const pending = this.initialResponse
                    if (response.hasError) {
                        pending?.reject(new Error(`The ET server refused the session: ${response.error}`))
                    } else {
                        pending?.resolve()
                    }
                    break
                }

                case ETPacketType.PORT_FORWARD_DESTINATION_REQUEST:
                case ETPacketType.PORT_FORWARD_DESTINATION_RESPONSE:
                case ETPacketType.PORT_FORWARD_DATA:
                    this.forwards.handlePacket(header, payload)
                    break

                default:
                    // Do NOT throw: an unknown header must not kill the session.
                    this.logger.warn(`Ignoring unknown ET packet type ${header}`)
            }
        } catch (err) {
            // A malformed packet (or a decoding bug) must not tear the session
            // down: it would be read as a socket failure and put us into the
            // reconnect loop, and a hostile peer could keep us there forever.
            // Drop the packet and carry on; a real desync still fails at the
            // Poly1305 check inside BackedReader.read, which DOES reconnect.
            this.logger.warn(`Dropping malformed ET packet (header ${header}): ${err}`)
        }
    }

    private onConnectionState (state: ETConnectionState): void {
        this.connectionState = state
        this.connectionStateSubject.next(state)
        if (state === 'reconnecting') {
            // Logged only: the tab shows a sticky toast from connectionState$
            // so this must not also land in the terminal or as a second toast.
            this.emitServiceMessage(
                colors.bgYellow.black(' ~ ') + ' Connection lost, attempting to resume the session...',
                { notify: false },
            )
        }
        if (state === 'connected' && this.open) {
            if (this.droppedInputSinceReconnect) {
                this.droppedInputSinceReconnect = false
                this.emitServiceMessage(
                    colors.bgYellow.black(' ~ ') + ' Some input was dropped while the connection was down',
                )
            }
            this.emitServiceMessage(colors.bgGreen.black(' OK ') + ' Session resumed', { notify: false })
            // A completed handshake is inbound proof of life, so the probe clock
            // starts fresh rather than firing immediately after every resume.
            this.noteInboundTraffic()
            // The remote PTY size may have been changed by another client.
            this.sendTerminalInfo(true)
        }
    }

    // ---- BaseSession contract ---------------------------------------------

    write (data: Buffer): void {
        if (!this.connection) {
            return
        }
        // Chunk to match ET's own 16 KiB reads.
        for (let offset = 0; offset < data.length; offset += TERMINAL_CHUNK_SIZE) {
            const chunk = data.subarray(offset, offset + TERMINAL_CHUNK_SIZE)
            if (!this.connection.writePacket(ETPacketType.TERMINAL_BUFFER, encodeTerminalBuffer(chunk))) {
                this.droppedInputSinceReconnect = true
            }
        }
        // NOTE: deliberately does NOT touch the keepalive. Sending bytes is no
        // evidence the link is alive; see noteInboundTraffic().
    }

    resize (columns: number, rows: number): void {
        if (!columns || !rows) {
            return
        }
        this.lastSize = { columns, rows }
        this.sendTerminalInfo()
    }

    private sendTerminalInfo (force = false): void {
        if (!this.connection || !this.lastSize.columns) {
            return
        }
        if (!force && !this.open) {
            return
        }
        this.connection.writePacket(ETPacketType.TERMINAL_INFO, encodeTerminalInfo({
            row: this.lastSize.rows,
            column: this.lastSize.columns,
            width: 0,
            height: 0,
        }))
    }

    kill (_signal?: string): void {
        // ET has no "kill the remote shell" packet. Closing the socket only detaches;
        // the remote session survives until its shell exits. See ETERNAL_TERMINAL.md D9.
        // BaseSession.destroy() remains the lifecycle owner (it emits closed$/destroyed$);
        // kill() only tears the transport down and must be safe to call from anywhere.
        this.stopKeepalive()
        this.connection?.shutdown()
    }

    async destroy (): Promise<void> {
        this.stopKeepalive()
        this.forwards.dispose()
        this.connection?.shutdown()
        this.connection = null
        // Reject a pending INITIAL_RESPONSE wait so a start() that is still in
        // flight cannot outlive the session.
        this.initialResponse?.reject(new Error('Session destroyed'))
        this.initialResponse = null
        this.serviceMessage.complete()
        this.kiPrompt.complete()
        this.connectionStateSubject.complete()
        this.bootstrapSession.complete()
        await super.destroy()
    }

    async gracefullyKillProcess (): Promise<void> {
        this.kill()
    }

    supportsWorkingDirectory (): boolean {
        return !!this.reportedCWD
    }

    async getWorkingDirectory (): Promise<string|null> {
        return this.reportedCWD ?? null
    }

    async getChildProcesses (): Promise<any[]> {
        return []
    }

    emitServiceMessage (msg: string, options?: { notify?: boolean }): void {
        if (options?.notify !== false) {
            this.serviceMessage.next(msg)
        }
        this.logger.info(stripAnsi(msg))
    }

    // ---- keepalive --------------------------------------------------------

    /** Effective probe interval in ms. ET clamps this to 1-5 seconds. */
    private get keepaliveIntervalMs (): number {
        const configured = this.profile.options.keepaliveInterval
        // A hand-edited config file can hold a string or null here. Math.max(NaN, 1)
        // is NaN, and setInterval(fn, NaN) fires every millisecond - which would
        // turn the probe below into a reconnect storm.
        const seconds = typeof configured === 'number' && Number.isFinite(configured) ? configured : 5
        return Math.min(Math.max(seconds, 1), 5) * 1000
    }

    private startKeepalive (): void {
        const interval = this.keepaliveIntervalMs
        this.stopKeepalive()
        this.noteInboundTraffic()
        this.keepaliveTimer = setInterval(() => {
            if (!this.connection || this.connection.state !== 'connected') {
                this.awaitingKeepalive = false
                return
            }
            if (Date.now() - this.lastInboundAt < interval) {
                // Traffic is arriving, so the link is demonstrably alive. ET resets
                // its keepalive timer on inbound traffic; there is nothing to probe.
                this.awaitingKeepalive = false
                return
            }
            if (this.awaitingKeepalive) {
                // A probe went out a full interval ago and NOTHING has come back.
                this.logger.info('Missed a keepalive; forcing a reconnect')
                this.awaitingKeepalive = false
                this.connection.forceReconnect()
                return
            }
            this.connection.writePacket(ETPacketType.KEEP_ALIVE, Buffer.alloc(0))
            this.awaitingKeepalive = true
        }, interval)
    }

    /**
     * Record proof that the link is alive. INBOUND traffic only.
     *
     * Outbound writes must never clear `awaitingKeepalive`: they say nothing about
     * whether the peer is still there. Resetting on every keystroke meant a user
     * typing into a black-holed connection cleared the outstanding probe before
     * the next tick could notice it had gone unanswered, so the dead link was
     * never detected and the session never resumed - the exact failure ET exists
     * to prevent.
     */
    private noteInboundTraffic (): void {
        this.awaitingKeepalive = false
        this.lastInboundAt = Date.now()
    }

    private stopKeepalive (): void {
        if (this.keepaliveTimer) {
            clearInterval(this.keepaliveTimer)
            this.keepaliveTimer = null
        }
    }

    /** Exposed for the "Force reconnect" hotkey and for tests. */
    forceReconnect (): void {
        this.connection?.forceReconnect()
    }
}
