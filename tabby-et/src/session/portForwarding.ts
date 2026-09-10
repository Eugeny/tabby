/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { createServer, Server, Socket } from 'net'
import { Logger } from 'tabby-core'
import { ForwardedPortConfig, PortForwardType } from 'tabby-ssh'

import { ETProfileOptions } from '../api/interfaces'
import { ETPacketType, PORT_FORWARD_CHUNK_SIZE } from '../protocol/constants'
import {
    PortForwardSourceRequest, decodePortForwardData, decodePortForwardDestinationRequest,
    decodePortForwardDestinationResponse, encodePortForwardData,
    encodePortForwardDestinationRequest, encodePortForwardDestinationResponse,
} from '../protocol/messages'

/** Returns false when the packet had to be dropped (the ET write buffer is full). */
type Send = (header: number, payload: Buffer) => boolean

/**
 * Which side of a tunnel we are for a given socket. The two roles have
 * INDEPENDENT socketId namespaces - ours are allocated by `nextSocketId`, the
 * peer's by the peer (upstream uses rand()) - so ids collide routinely and every
 * lookup, insert and delete has to name its role.
 */
type Role = 'source'|'destination'

/**
 * Ceiling on sockets a peer can make us open at once. Every one of these is an
 * inbound PORT_FORWARD_DESTINATION_REQUEST, i.e. peer-driven: without a cap a
 * compromised etserver could exhaust our file descriptors through a single
 * declared reverse tunnel.
 */
const MAX_CONCURRENT_DESTINATION_SOCKETS = 256

/**
 * How much data may sit queued for one local socket before we give up on it.
 *
 * The ET connection is a single multiplexed stream, so we cannot apply
 * backpressure to the peer without stalling every other tunnel and the terminal
 * as well. Bound the damage to the one socket that is not keeping up instead.
 */
const MAX_LOCAL_WRITE_BACKLOG = 8 * 1024 * 1024

/**
 * What a destination endpoint actually resolves to.
 *
 * `SocketEndpoint` carries both a name and a port, and the two are not mutually
 * exclusive on the wire. Every decision about an endpoint - both the allow-list
 * check and the connect that follows it - MUST go through resolveDestination()
 * so that they cannot disagree about which field wins.
 */
type ResolvedDestination =
    { kind: 'tcp', port: number }
    | { kind: 'pipe', path: string }

function isValidPort (port: number|undefined): port is number {
    return port !== undefined && Number.isInteger(port) && port >= 1 && port <= 65535
}

/**
 * The single rule for reading a destination endpoint.
 *
 * A usable port wins, exactly as upstream's createDestination does; otherwise a
 * name means a Unix socket or named pipe. Anything else is malformed.
 */
function resolveDestination (target: { name?: string, port?: number }): ResolvedDestination|null {
    if (isValidPort(target.port)) {
        return { kind: 'tcp', port: target.port }
    }
    if (target.name) {
        return { kind: 'pipe', path: target.name }
    }
    return null
}

interface SourceListener {
    config: ForwardedPortConfig
    server: Server
}

function describe (c: ForwardedPortConfig): string {
    return c.type === PortForwardType.Local
        ? `(local) ${c.host}:${c.port} -> (remote) localhost:${c.targetPort}`
        // ET lands reverse-tunnel traffic on the CLIENT's localhost:port; the
        // configured target address is ignored for TCP (PortForwardHandler::
        // createDestination connects to ::1 / 127.0.0.1), so say so.
        : `(remote) ${c.host}:${c.port} -> (local) localhost:${c.targetPort}`
}

function resolveAgentPath (): string|null {
    // An explicitly configured agent wins everywhere - including on Windows,
    // where Pageant/gpg-agent shims set SSH_AUTH_SOCK too. Only fall back to the
    // stock OpenSSH pipe, which may or may not have an agent behind it; if it
    // does not, the connect attempt fails and we answer with a destination error.
    return process.env.SSH_AUTH_SOCK
        ?? (process.platform === 'win32' ? '\\\\.\\pipe\\openssh-ssh-agent' : null)
}

export class ETPortForwardHandler {
    /** Sockets we accepted locally, awaiting a socketId from the peer. Keyed by our token. */
    private unassigned = new Map<number, { socket: Socket, config: ForwardedPortConfig }>()
    /** socketId -> local socket, for tunnels where WE are the source. */
    private sourceSockets = new Map<number, Socket>()
    /** Which declared forward each source socket belongs to (for live removal). */
    private sourceSocketConfigs = new Map<number, ForwardedPortConfig>()
    /** socketId -> local socket, for tunnels where WE are the destination. */
    private destinationSockets = new Map<number, Socket>()
    private listeners: SourceListener[] = []
    /**
     * Destinations we declared in INITIAL_PAYLOAD. Inbound
     * PORT_FORWARD_DESTINATION_REQUEST packets make us open sockets, so every one
     * of them is checked against this list: a malicious etserver must not be able
     * to pivot us at arbitrary local or intranet ports (see §17.4).
     */
    private declaredReverseDestinations: ResolvedDestination[] = []
    /**
     * Forwards this SESSION currently has, for the runtime port-forwarding UI.
     * Stable array identity: mutated in place, never reassigned, so an Angular
     * template can bind straight to it.
     */
    readonly activeForwards: ForwardedPortConfig[] = []
    /** Destination sockets that are connecting but not yet in destinationSockets. */
    private pendingDestinations = 0
    private nextToken = 1
    private nextSocketId = 1

    constructor (
        private logger: Logger,
        private send: Send,
        private emitServiceMessage: (msg: string) => void,
    ) {}

    // ---- setup ------------------------------------------------------------

    async startLocalForwards (configs: ForwardedPortConfig[]): Promise<void> {
        for (const config of configs.filter(x => x.type === PortForwardType.Local)) {
            try {
                await this.addLocalForward(config)
            } catch (err) {
                this.emitServiceMessage(`Failed to forward ${describe(config)}: ${err}`)
            }
        }
    }

    addLocalForward (config: ForwardedPortConfig): Promise<void> {
        return new Promise((resolve, reject) => {
            const server = createServer(socket => this.onLocalConnection(config, socket))
            const onListenError = (err: Error) => reject(err)
            server.once('error', onListenError)
            server.listen(config.port, config.host, () => {
                server.removeListener('error', onListenError)
                // A net.Server with no 'error' listener THROWS on any later error
                // (EMFILE while accepting, for one), which would take the whole
                // renderer down. Keep one attached for the listener's lifetime,
                // and report only the first - the rest are noise from the teardown.
                let reported = false
                server.on('error', err => {
                    if (reported) {
                        return
                    }
                    reported = true
                    this.emitServiceMessage(`Port forward ${describe(config)} failed: ${err.message}`)
                    this.removeForward(config)
                })
                this.listeners.push({ config, server })
                this.activeForwards.push(config)
                this.emitServiceMessage(`Forwarding ${describe(config)}`)
                resolve()
            })
        })
    }

    removeForward (config: ForwardedPortConfig): void {
        const index = this.listeners.findIndex(x => x.config === config)
        if (index >= 0) {
            this.listeners[index].server.close()
            this.listeners.splice(index, 1)
            this.forgetActiveForwards(x => x === config)
            // The forward no longer exists from the user's point of view, so its
            // live tunnelled connections go too.
            for (const [socketId, owned] of this.sourceSocketConfigs) {
                if (owned === config) {
                    this.sourceSockets.get(socketId)?.destroy()
                }
            }
            for (const [token, entry] of this.unassigned) {
                if (entry.config === config) {
                    entry.socket.destroy()
                    this.unassigned.delete(token)
                }
            }
            this.emitServiceMessage(`Stopped forwarding ${describe(config)}`)
        }
    }

    /**
     * Reverse tunnels are declared in InitialPayload, not created at runtime.
     * Agent forwarding is just a reverse tunnel with an environment variable and NO source.
     */
    buildReverseTunnelRequests (options: ETProfileOptions): PortForwardSourceRequest[] {
        const requests: PortForwardSourceRequest[] = []
        this.declaredReverseDestinations = []
        this.forgetActiveForwards(x => x.type === PortForwardType.Remote)

        for (const config of options.forwardedPorts.filter(x => x.type === PortForwardType.Remote)) {
            // A port outside 1-65535 cannot be declared as TCP, and declaring it
            // anyway would put an entry in the allow-list that no TCP request can
            // match - leaving the endpoint reachable only through the name branch.
            // Refuse the whole tunnel instead.
            if (!isValidPort(config.port) || !isValidPort(config.targetPort)) {
                this.emitServiceMessage(
                    `Skipping the reverse tunnel ${config.host}:${config.port} -> localhost:${config.targetPort}: `
                    + 'both ports must be between 1 and 65535.',
                )
                continue
            }
            requests.push({
                source: { name: config.host, port: config.port },
                destination: { name: config.targetAddress, port: config.targetPort },
            })
            this.declaredReverseDestinations.push({ kind: 'tcp', port: config.targetPort })
            this.activeForwards.push(config)
        }

        if (options.forwardAgent) {
            const authSock = resolveAgentPath()
            if (!authSock) {
                this.emitServiceMessage(
                    'Agent forwarding is enabled but no SSH agent was found; skipping it',
                )
            } else {
                // NOTE: source MUST be omitted here - etserver rejects a request that has
                // both a source and an environment variable.
                requests.push({
                    destination: { name: authSock },
                    environmentVariable: 'SSH_AUTH_SOCK',
                })
                this.declaredReverseDestinations.push({ kind: 'pipe', path: authSock })
            }
        }

        return requests
    }

    /** Drop matching entries from activeForwards in place, preserving array identity. */
    private forgetActiveForwards (predicate: (c: ForwardedPortConfig) => boolean): void {
        for (let i = this.activeForwards.length - 1; i >= 0; i--) {
            if (predicate(this.activeForwards[i])) {
                this.activeForwards.splice(i, 1)
            }
        }
    }

    // ---- we are the SOURCE ------------------------------------------------

    private onLocalConnection (config: ForwardedPortConfig, socket: Socket): void {
        const token = this.nextToken++
        // Pause until the peer assigns a socketId, otherwise early bytes are lost.
        socket.pause()
        this.unassigned.set(token, { socket, config })

        socket.once('error', () => {
            this.unassigned.delete(token)
            socket.destroy()
        })

        this.send(ETPacketType.PORT_FORWARD_DESTINATION_REQUEST, encodePortForwardDestinationRequest({
            // ET ignores the destination name for TCP and connects to the remote
            // localhost, but we send it anyway for forward compatibility.
            destination: { name: config.targetAddress, port: config.targetPort },
            fd: token,
        }))
    }

    private onDestinationResponse (payload: Buffer): void {
        const response = decodePortForwardDestinationResponse(payload)
        const token = response.clientFd ?? -1
        const entry = this.unassigned.get(token)
        this.unassigned.delete(token)

        if (!entry) {
            this.logger.warn(`Destination response for an unknown token ${token}`)
            return
        }
        if (response.hasError) {
            this.emitServiceMessage(`Remote refused a forwarded connection: ${response.error}`)
            entry.socket.destroy()
            return
        }
        if (response.socketId === undefined) {
            // Without a socketId we could not route PF_DATA for this socket;
            // writing one with the field omitted would corrupt the peer's maps.
            this.logger.warn('Destination response without a socket id; dropping the connection')
            entry.socket.destroy()
            return
        }

        const socketId = response.socketId
        const previous = this.sourceSockets.get(socketId)
        if (previous) {
            // socketIds are allocated by the peer (upstream uses rand()), so treat
            // a collision as "the peer considers the old one dead". Destroy it
            // BEFORE registering the replacement: destroy() emits 'close'
            // asynchronously, and forget() is identity-checked precisely so that
            // late 'close' cannot evict the socket that took its id.
            previous.destroy()
        }
        this.sourceSockets.set(socketId, entry.socket)
        this.sourceSocketConfigs.set(socketId, entry.config)
        this.pipeSocket(entry.socket, socketId, 'source')
        entry.socket.resume()
    }

    // ---- we are the DESTINATION -------------------------------------------

    private onDestinationRequest (payload: Buffer): void {
        const request = decodePortForwardDestinationRequest(payload)
        // Resolve FIRST, then check the resolved endpoint, then act on that same
        // resolved endpoint. The check and the connect must never re-read the raw
        // fields independently: a request naming the declared agent socket AND a
        // port used to pass the name-based check and then get connected as TCP,
        // turning any declared reverse tunnel into an arbitrary localhost pivot.
        const resolved = resolveDestination(request.destination)

        if (!resolved) {
            this.sendDestinationError(request.fd, new Error('Malformed port forward destination'))
            return
        }

        if (!this.isDeclaredReverseDestination(resolved)) {
            this.logger.warn('Rejected a port-forward destination that was not declared for this session')
            this.sendDestinationError(request.fd, new Error('Destination was not declared for this session'))
            return
        }

        if (this.destinationSockets.size + this.pendingDestinations >= MAX_CONCURRENT_DESTINATION_SOCKETS) {
            this.logger.warn('Refused a port-forward destination: too many concurrent forwarded connections')
            this.sendDestinationError(request.fd, new Error('Too many concurrent forwarded connections'))
            return
        }
        this.pendingDestinations++
        // Exactly one of these runs, exactly once, so the pending count is always
        // released - including on the malformed-destination path below.
        let settled = false
        const connected = (socket: Socket) => {
            if (settled) {
                socket.destroy()
                return
            }
            settled = true
            this.pendingDestinations--
            this.onDestinationConnected(socket, request.fd)
        }
        const failed = (err: Error) => {
            if (settled) {
                return
            }
            settled = true
            this.pendingDestinations--
            this.sendDestinationError(request.fd, err)
        }

        if (resolved.kind === 'tcp') {
            // Upstream always connects TCP destinations to the connecting side's
            // own localhost (::1, then 127.0.0.1) and ignores destination.name -
            // including on the client side for reverse tunnels. Mirror that.
            this.connectLocalhost(resolved.port, connected, failed)
        } else {
            // Unix socket path, or a Windows named pipe for agent forwarding.
            const socket = new Socket()
            socket.setNoDelay(true)
            const onConnectError = (err: Error) => {
                socket.destroy()
                failed(err)
            }
            socket.once('error', onConnectError)
            socket.connect(resolved.path, () => {
                // Hand the socket over cleanly: pipeSocket installs its own error
                // handling, and leaving this one attached would answer a mid-stream
                // error with a second DESTINATION_RESPONSE for the same fd.
                socket.removeListener('error', onConnectError)
                connected(socket)
            })
        }
    }

    private onDestinationConnected (socket: Socket, fd: number): void {
        const socketId = this.nextSocketId++
        this.destinationSockets.set(socketId, socket)
        this.send(
            ETPacketType.PORT_FORWARD_DESTINATION_RESPONSE,
            encodePortForwardDestinationResponse({ clientFd: fd, socketId, hasError: false }),
        )
        this.pipeSocket(socket, socketId, 'destination')
    }

    private sendDestinationError (fd: number, err: Error): void {
        this.send(
            ETPacketType.PORT_FORWARD_DESTINATION_RESPONSE,
            encodePortForwardDestinationResponse({ clientFd: fd, hasError: true, error: err.message }),
        )
    }

    /** ::1 first, then 127.0.0.1 - a fresh socket per attempt, matching upstream. */
    private connectLocalhost (port: number, onConnect: (socket: Socket) => void, onError: (err: Error) => void): void {
        const hosts = ['::1', '127.0.0.1']
        const attempt = (index: number): void => {
            const socket = new Socket()
            socket.setNoDelay(true)
            const fail = (err: Error) => {
                socket.destroy()
                if (index + 1 < hosts.length) {
                    attempt(index + 1)
                } else {
                    onError(err)
                }
            }
            socket.once('error', fail)
            socket.connect(port, hosts[index], () => {
                socket.removeListener('error', fail)
                onConnect(socket)
            })
        }
        attempt(0)
    }

    /**
     * A destination request is only honoured when it matches something we declared
     * in INITIAL_PAYLOAD, compared as the SAME resolved kind.
     *
     * Matching kind-for-kind is what closes the bypass: a TCP request can only ever
     * be satisfied by a TCP entry (matched on port - the name is not authoritative
     * for TCP and older servers may not echo it), and a pipe request only by a pipe
     * entry (matched on path). An endpoint carrying both fields can no longer be
     * validated as one kind and connected as the other.
     */
    private isDeclaredReverseDestination (resolved: ResolvedDestination): boolean {
        return this.declaredReverseDestinations.some(d =>
            d.kind === 'tcp'
                ? resolved.kind === 'tcp' && d.port === resolved.port
                : resolved.kind === 'pipe' && d.path === resolved.path,
        )
    }

    // ---- shared plumbing --------------------------------------------------

    private pipeSocket (socket: Socket, socketId: number, role: Role): void {
        // The wire flag is about direction of travel, not about our role: data we
        // send as the source travels source -> destination.
        const sourceToDestination = role === 'source'

        socket.on('data', (data: Buffer) => {
            for (let o = 0; o < data.length; o += PORT_FORWARD_CHUNK_SIZE) {
                const sent = this.send(ETPacketType.PORT_FORWARD_DATA, encodePortForwardData({
                    sourceToDestination,
                    socketId,
                    buffer: data.subarray(o, o + PORT_FORWARD_CHUNK_SIZE),
                }))
                if (!sent) {
                    // Unlike terminal input, a forwarded stream is a reliable byte
                    // stream: silently skipping a packet hands the peer a hole it
                    // can never detect. Fail the connection instead, so the local
                    // application sees a reset rather than corrupt data.
                    this.emitServiceMessage(
                        'Dropped a forwarded connection: the ET write buffer is full',
                    )
                    this.closeForwardedSocket(role, socketId, socket)
                    return
                }
            }
        })
        socket.on('end', () => {
            this.send(ETPacketType.PORT_FORWARD_DATA, encodePortForwardData({
                sourceToDestination, socketId, closed: true,
            }))
        })
        socket.on('error', err => {
            this.send(ETPacketType.PORT_FORWARD_DATA, encodePortForwardData({
                sourceToDestination, socketId, error: err.message,
            }))
            this.forget(role, socketId, socket)
        })
        socket.on('close', () => this.forget(role, socketId, socket))
    }

    /** Tear a tunnelled connection down and tell the peer, best effort. */
    private closeForwardedSocket (role: Role, socketId: number, socket: Socket): void {
        this.send(ETPacketType.PORT_FORWARD_DATA, encodePortForwardData({
            sourceToDestination: role === 'source', socketId, closed: true,
        }))
        socket.destroy()
        this.forget(role, socketId, socket)
    }

    private socketsFor (role: Role): Map<number, Socket> {
        return role === 'source' ? this.sourceSockets : this.destinationSockets
    }

    /**
     * Unregister a socket from ITS OWN role's map only.
     *
     * Both the role and the socket identity matter. The two maps are separate id
     * namespaces, so deleting `socketId` from both would evict an unrelated live
     * connection that happens to share the number; and a destroyed socket's
     * 'close' arrives a tick late, so without the identity check it would evict
     * the replacement that already took its id.
     */
    private forget (role: Role, socketId: number, socket: Socket): void {
        const map = this.socketsFor(role)
        if (map.get(socketId) !== socket) {
            return
        }
        map.delete(socketId)
        if (role === 'source') {
            this.sourceSocketConfigs.delete(socketId)
        }
    }

    handlePacket (header: number, payload: Buffer): void {
        // A malformed packet must never throw out of here: ETSession treats a
        // throw as a socket failure and would churn the connection. Drop it and
        // carry on; a genuine crypto desync still fails inside BackedReader.
        try {
            this.handlePacketInner(header, payload)
        } catch (err) {
            this.logger.warn(`Dropping malformed port-forward packet (header ${header}): ${err}`)
        }
    }

    private handlePacketInner (header: number, payload: Buffer): void {
        if (header === ETPacketType.PORT_FORWARD_DESTINATION_REQUEST) {
            this.onDestinationRequest(payload)
            return
        }
        if (header === ETPacketType.PORT_FORWARD_DESTINATION_RESPONSE) {
            this.onDestinationResponse(payload)
            return
        }
        // PORT_FORWARD_DATA
        const data = decodePortForwardData(payload)
        // sourceToDestination=true means "for whoever is the destination", i.e. us when
        // the peer is the source. The two maps keep the roles apart.
        const role: Role = data.sourceToDestination ? 'destination' : 'source'
        const socket = this.socketsFor(role).get(data.socketId)
        if (!socket) {
            this.logger.debug(`Data for a closed forwarded socket ${data.socketId}`)
            return
        }
        if (data.error !== undefined) {
            // The far side failed mid-stream. Whatever is still queued locally is
            // part of a stream we know to be broken, so dropping it is correct.
            socket.destroy()
            this.forget(role, data.socketId, socket)
            return
        }
        if (data.closed !== undefined) {
            // Clean EOF. destroy() would discard the socket's writable buffer and
            // silently truncate the transfer whenever the local reader is slower
            // than the tunnel - a short file with no error anywhere. end() flushes
            // what is queued, then closes.
            this.forget(role, data.socketId, socket)
            socket.end()
            return
        }
        if (data.buffer?.length) {
            socket.write(data.buffer)
            if (socket.writableLength > MAX_LOCAL_WRITE_BACKLOG) {
                // We cannot push back on the peer: one multiplexed stream carries
                // every tunnel and the terminal, so pausing it would stall all of
                // them. An authenticated-but-hostile server could otherwise grow
                // the renderer's heap without bound through a declared tunnel
                // whose local endpoint accepts but never reads.
                this.emitServiceMessage(
                    'Closed a forwarded connection: the local endpoint is not reading fast enough',
                )
                this.closeForwardedSocket(role, data.socketId, socket)
            }
        }
    }

    dispose (): void {
        for (const l of this.listeners) {
            l.server.close()
        }
        this.listeners = []
        for (const e of [...this.unassigned.values()]) {
            e.socket.destroy()
        }
        for (const s of [...this.sourceSockets.values(), ...this.destinationSockets.values()]) {
            s.destroy()
        }
        this.unassigned.clear()
        this.sourceSockets.clear()
        this.sourceSocketConfigs.clear()
        this.destinationSockets.clear()
        this.declaredReverseDestinations = []
        this.activeForwards.length = 0
        this.pendingDestinations = 0
    }
}
