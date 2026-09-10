import {
    ProtoWriter, decodeFields, getBool, getBytes, getInt32, getRepeatedBytes, getString, has,
} from './protobuf'

export interface SocketEndpoint {
    name?: string
    port?: number
}

export function encodeSocketEndpoint (e: SocketEndpoint): Buffer {
    return new ProtoWriter()
        .string(1, e.name)
        .int32(2, e.port)
        .finish()
}

export function decodeSocketEndpoint (buf: Buffer): SocketEndpoint {
    const m = decodeFields(buf)
    return { name: getString(m, 1), port: getInt32(m, 2) }
}

// ---- ET.proto -------------------------------------------------------------

export function encodeConnectRequest (clientId: string, version: number): Buffer {
    return new ProtoWriter()
        .string(1, clientId)
        .int32(2, version)
        .finish()
}

export interface ConnectResponse {
    status?: number
    error?: string
}

export function decodeConnectResponse (buf: Buffer): ConnectResponse {
    const m = decodeFields(buf)
    return { status: getInt32(m, 1), error: getString(m, 2) }
}

export function encodeSequenceHeader (sequenceNumber: number): Buffer {
    // Always write the field, even when 0: ET reads it with a plain accessor and a
    // missing field would be indistinguishable from 0 anyway, but being explicit
    // keeps the bytes identical to what the reference client sends.
    return new ProtoWriter().int32(1, sequenceNumber).finish()
}

export function decodeSequenceHeader (buf: Buffer): number {
    return getInt32(decodeFields(buf), 1) ?? 0
}

export function encodeCatchupBuffer (entries: Buffer[]): Buffer {
    const w = new ProtoWriter()
    for (const e of entries) {
        w.bytes(1, e)
    }
    return w.finish()
}

export function decodeCatchupBuffer (buf: Buffer): Buffer[] {
    return getRepeatedBytes(decodeFields(buf), 1)
}

// ---- ETerminal.proto ------------------------------------------------------

export interface PortForwardSourceRequest {
    /** MUST be omitted when environmentVariable is set. */
    source?: SocketEndpoint
    destination?: SocketEndpoint
    environmentVariable?: string
}

export function encodePortForwardSourceRequest (r: PortForwardSourceRequest): Buffer {
    const w = new ProtoWriter()
    if (r.source) {
        w.message(1, encodeSocketEndpoint(r.source))
    }
    if (r.destination) {
        w.message(2, encodeSocketEndpoint(r.destination))
    }
    w.string(3, r.environmentVariable)
    return w.finish()
}

export interface InitialPayload {
    jumphost: boolean
    reverseTunnels: PortForwardSourceRequest[]
    environmentVariables: Record<string, string>
}

export function encodeInitialPayload (p: InitialPayload): Buffer {
    const w = new ProtoWriter()
    w.bool(1, p.jumphost)
    for (const t of p.reverseTunnels) {
        w.message(2, encodePortForwardSourceRequest(t))
    }
    // map<string,string> is encoded as repeated messages of { 1: key, 2: value }.
    // Field 3 only exists in ET >= 7.0.0; older servers ignore unknown fields.
    for (const [k, v] of Object.entries(p.environmentVariables)) {
        w.message(3, new ProtoWriter().string(1, k).string(2, v).finish())
    }
    return w.finish()
}

export interface InitialResponse {
    hasError: boolean
    error?: string
}

export function decodeInitialResponse (buf: Buffer): InitialResponse {
    const m = decodeFields(buf)
    return { hasError: has(m, 1), error: getString(m, 1) }
}

export function encodeTerminalBuffer (data: Buffer): Buffer {
    return new ProtoWriter().bytes(1, data).finish()
}

export function decodeTerminalBuffer (buf: Buffer): Buffer {
    return getBytes(decodeFields(buf), 1) ?? Buffer.alloc(0)
}

export interface TerminalInfo {
    row: number
    column: number
    width: number
    height: number
}

export function encodeTerminalInfo (t: TerminalInfo): Buffer {
    return new ProtoWriter()
        .int32(2, t.row)
        .int32(3, t.column)
        .int32(4, t.width)
        .int32(5, t.height)
        .finish()
}

export interface PortForwardDestinationRequest {
    destination: SocketEndpoint
    fd: number
}

export function encodePortForwardDestinationRequest (r: PortForwardDestinationRequest): Buffer {
    return new ProtoWriter()
        .message(1, encodeSocketEndpoint(r.destination))
        .int32(2, r.fd)
        .finish()
}

export function decodePortForwardDestinationRequest (buf: Buffer): PortForwardDestinationRequest {
    const m = decodeFields(buf)
    const dest = getBytes(m, 1)
    return {
        destination: dest ? decodeSocketEndpoint(dest) : {},
        fd: getInt32(m, 2) ?? -1,
    }
}

export interface PortForwardDestinationResponse {
    clientFd?: number
    socketId?: number
    hasError: boolean
    error?: string
}

export function encodePortForwardDestinationResponse (r: PortForwardDestinationResponse): Buffer {
    const w = new ProtoWriter()
    w.int32(1, r.clientFd)
    w.int32(2, r.socketId)
    if (r.hasError) {
        w.string(3, r.error ?? '')
    }
    return w.finish()
}

export function decodePortForwardDestinationResponse (buf: Buffer): PortForwardDestinationResponse {
    const m = decodeFields(buf)
    return {
        clientFd: getInt32(m, 1),
        socketId: getInt32(m, 2),
        hasError: has(m, 3),
        error: getString(m, 3),
    }
}

export interface PortForwardData {
    sourceToDestination: boolean
    socketId: number
    buffer?: Buffer
    /** Presence-sensitive: only set these when they are true/real. */
    closed?: boolean
    error?: string
}

export function encodePortForwardData (d: PortForwardData): Buffer {
    const w = new ProtoWriter()
    w.bool(1, d.sourceToDestination)
    w.int32(2, d.socketId)
    w.bytes(3, d.buffer)
    w.string(4, d.error)
    // Only emit `closed` when closing. ET tests has_closed(), so `closed=false`
    // would be read as "this socket is closing".
    if (d.closed) {
        w.bool(5, true)
    }
    return w.finish()
}

export function decodePortForwardData (buf: Buffer): PortForwardData {
    const m = decodeFields(buf)
    return {
        sourceToDestination: getBool(m, 1) ?? false,
        socketId: getInt32(m, 2) ?? -1,
        buffer: getBytes(m, 3),
        error: has(m, 4) ? getString(m, 4) ?? '' : undefined,
        closed: has(m, 5) ? getBool(m, 5) : undefined,
    }
}
