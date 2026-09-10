import { ForwardedPortConfig, PortForwardType } from 'tabby-ssh'

/** A spec expanding to an absurd number of forwards is more likely a typo (or a paste accident) than intent. */
const MAX_RANGE_PORTS = 1024

/**
 * Does this bind address keep a local listener private to this machine?
 *
 * A forward that binds anything else exposes the tunnel - and whatever sits at
 * the far end of it - to the local network, so §17.4 requires warning about it.
 * An empty address is NOT loopback: net.Server treats it as "all interfaces".
 */
export function isLoopbackBindAddress (host: string): boolean {
    const h = host.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
    return h === 'localhost'
        || h === '::1'
        || h === '0:0:0:0:0:0:0:1'
        || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)
}

function parsePort (s: string): number {
    const port = parseInt(s, 10)
    if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid port "${s}"`)
    }
    return port
}

function parseRange (s: string): number[] {
    if (!s.includes('-')) {
        return [parsePort(s)]
    }
    const [fromStr, toStr] = s.split('-')
    let from = NaN
    let to = NaN
    try {
        from = parsePort(fromStr)
        to = parsePort(toStr)
    } catch {
        // Report the whole range token: "Invalid port \"\"" for "-5" helps nobody.
        throw new Error(`Invalid port range "${s}"`)
    }
    if (to < from) {
        throw new Error(`Invalid port range "${s}"`)
    }
    if (to - from + 1 > MAX_RANGE_PORTS) {
        throw new Error(`Port range "${s}" is too large (maximum ${MAX_RANGE_PORTS} ports)`)
    }
    const out: number[] = []
    for (let p = from; p <= to; p++) {
        out.push(p)
    }
    return out
}

function make (
    type: PortForwardType, host: string, port: number,
    targetAddress: string, targetPort: number, description: string,
): ForwardedPortConfig {
    return { type, host, port, targetAddress, targetPort, description }
}

/**
 * Parse an ET tunnel spec into individual forwards.
 * Supported: "8080:80", "8080-8089:9080-9089", "bind:8080:host:80".
 * Ranges must be equal length on both sides. Unix-socket specs are rejected here
 * because the UI models TCP forwards only.
 */
export function parseTunnelSpec (spec: string, type: PortForwardType): ForwardedPortConfig[] {
    const out: ForwardedPortConfig[] = []
    for (const element of spec.split(',').map(x => x.trim()).filter(x => x)) {
        const parts = element.split(':')

        if (parts.length === 4) {
            out.push(make(type, parts[0], parsePort(parts[1]), parts[2], parsePort(parts[3]), element))
            continue
        }
        if (parts.length !== 2) {
            throw new Error(`Cannot parse tunnel "${element}". Use PORT:PORT or BIND:PORT:HOST:PORT.`)
        }

        const [left, right] = parts
        if (left.includes('-') || right.includes('-')) {
            const l = parseRange(left)
            const r = parseRange(right)
            if (l.length !== r.length) {
                throw new Error(`Port ranges in "${element}" have different lengths`)
            }
            for (let i = 0; i < l.length; i++) {
                out.push(make(type, '127.0.0.1', l[i], 'localhost', r[i], element))
            }
            continue
        }
        out.push(make(type, '127.0.0.1', parsePort(left), 'localhost', parsePort(right), element))
    }
    return out
}
