import { DEFAULT_ET_PORT } from './protocol/constants'

export interface ETQuickConnectTarget {
    host: string
    user?: string
    port: number
}

/**
 * Parse a port, falling back to the ET default for anything that is not a real
 * TCP port. `parseInt` alone is not enough: it happily yields 0, negatives and
 * values past 65535, which then fail deep inside net.connect instead of here.
 */
function parsePortOrDefault (text: string): number {
    const parsed = parseInt(text, 10)
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : DEFAULT_ET_PORT
}

/**
 * Pure parser behind ETProfilesService.quickConnect.
 *
 * Accepts "user@host", "user@host:2022", "user@[::1]:2022", and tolerates a
 * leading "et " or "et://" so users can paste a command line. Never throws and
 * always produces a port in 1-65535: unparsable or out-of-range port parts fall
 * back to the default, and unbalanced brackets degrade to a best-effort host.
 */
export function parseQuickConnectQuery (query: string): ETQuickConnectTarget {
    let raw = query.trim().replace(/^et:\/\//, '').replace(/^et\s+/, '')
    let user: string|undefined = undefined
    let port = DEFAULT_ET_PORT

    if (raw.includes('@')) {
        const parts = raw.split(/@/g)
        raw = parts[parts.length - 1]
        user = parts.slice(0, parts.length - 1).join('@')
    }
    if (raw.includes('[')) {
        // Bracketed IPv6, optionally ":port" after the ']'. The ']' may be
        // missing in malformed input - treat the whole remainder as the host
        // instead of crashing on undefined.
        const after = raw.split(']')
        port = parsePortOrDefault(after.length > 1 ? after[1].substring(1) : '')
        raw = after[0].substring(1)
    } else if ((raw.match(/:/g) ?? []).length === 1) {
        // Exactly one ':' means host:port. Bare IPv6 hosts (::1) contain
        // multiple colons and never carry a port in this shorthand.
        port = parsePortOrDefault(raw.split(':')[1])
        raw = raw.split(':')[0]
    }

    return { host: raw, user, port }
}
