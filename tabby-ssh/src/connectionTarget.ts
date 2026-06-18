export const DEFAULT_SSH_PORT = 22

export function coerceSSHPort (port?: number | string | null, defaultPort = DEFAULT_SSH_PORT): number {
    if (port === null || port === undefined || port === '') {
        return defaultPort
    }
    const n = typeof port === 'number' ? port : parseInt(String(port), 10)
    return Number.isFinite(n) && n > 0 ? n : defaultPort
}

export function parseSSHAddress (query: string): { user?: string, host: string, port: number } {
    let user: string | undefined = undefined
    let host = query
    let port = DEFAULT_SSH_PORT
    if (host.includes('@')) {
        const parts = host.split(/@/g)
        host = parts[parts.length - 1]
        user = parts.slice(0, parts.length - 1).join('@')
    }
    if (host.includes('[')) {
        const match = /^\[([^\]]+)\](?::(\d+))?$/.exec(host)
        if (match) {
            host = match[1]
            if (match[2]) {
                port = coerceSSHPort(match[2], DEFAULT_SSH_PORT)
            }
        }
    } else if (/^[^:/]+:\d+$/.test(host)) {
        const idx = host.lastIndexOf(':')
        port = coerceSSHPort(host.slice(idx + 1), DEFAULT_SSH_PORT)
        host = host.slice(0, idx)
    }
    return { user, host, port }
}

export function resolveSSHConnectionTarget (
    host: string,
    port?: number | string | null,
    defaultPort = DEFAULT_SSH_PORT,
): { host: string, port: number } {
    const parsed = parseSSHAddress(host)
    const portFromField = coerceSSHPort(port, defaultPort)
    const resolvedPort = portFromField !== defaultPort || parsed.port === defaultPort
        ? portFromField
        : parsed.port
    return {
        host: parsed.host.trim(),
        port: resolvedPort,
    }
}
