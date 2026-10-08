import { Socket, connect, createServer, isIPv4 } from 'net'

const SOCKS_VERSION = 0x05
const AUTH_USERNAME_PASSWORD = 0x02
const AUTH_NONE_ACCEPTABLE = 0xff
const CMD_CONNECT = 0x01
const ATYP_IPV4 = 0x01
const ATYP_DOMAIN = 0x03
const ATYP_IPV6 = 0x04

const REPLY_ERRORS = {
    '1': 'general failure',
    '2': 'not allowed by ruleset',
    '3': 'network unreachable',
    '4': 'host unreachable',
    '5': 'connection refused',
    '6': 'TTL expired',
    '7': 'command not supported',
    '8': 'address type not supported',
}

export interface Socks5ConnectOptions {
    proxyHost: string
    proxyPort: number
    username: string
    password: string
    host: string
    port: number
}

/**
 * Connects to `host:port` through a SOCKS5 proxy, authenticating with a
 * username and password (RFC 1929). russh's built-in SOCKS support can only
 * connect to proxies that don't ask for credentials.
 *
 * The returned socket is paused with the handshake consumed, so anything the
 * target has already sent stays buffered until the caller reads from it.
 */
export function connectThroughSocks5 (options: Socks5ConnectOptions): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const username = Buffer.from(options.username)
        const password = Buffer.from(options.password)
        const hostname = Buffer.from(options.host)
        if (username.length > 255 || password.length > 255 || hostname.length > 255) {
            reject(new Error('SOCKS username, password and target hostname must each be at most 255 bytes'))
            return
        }

        const socket = connect(options.proxyPort, options.proxyHost)
        const fail = (message: string) => {
            socket.destroy()
            reject(new Error(message))
        }

        let buffer = Buffer.alloc(0)
        let step: 'method'|'auth'|'reply' = 'method'

        socket.on('error', reject)
        socket.on('close', () => reject(new Error('SOCKS proxy closed the connection')))
        socket.on('connect', () => socket.write(Buffer.from([SOCKS_VERSION, 1, AUTH_USERNAME_PASSWORD])))

        socket.on('data', function onData (chunk: Buffer) {
            buffer = Buffer.concat([buffer, chunk])

            if (step === 'method') {
                if (buffer.length < 2) {
                    return
                }
                if (buffer[0] !== SOCKS_VERSION || buffer[1] !== AUTH_USERNAME_PASSWORD) {
                    fail(buffer[1] === AUTH_NONE_ACCEPTABLE
                        ? 'SOCKS proxy rejected username/password authentication'
                        : `SOCKS proxy selected unsupported auth method 0x${buffer[1].toString(16)}`)
                    return
                }
                buffer = buffer.subarray(2)
                step = 'auth'
                socket.write(Buffer.concat([
                    Buffer.from([0x01, username.length]), username,
                    Buffer.from([password.length]), password,
                ]))
            }

            if (step === 'auth') {
                if (buffer.length < 2) {
                    return
                }
                if (buffer[1] !== 0x00) {
                    fail('SOCKS proxy rejected the username/password')
                    return
                }
                buffer = buffer.subarray(2)
                step = 'reply'

                const port = Buffer.alloc(2)
                port.writeUInt16BE(options.port)
                // Names are left for the proxy to resolve, matching the native path.
                // An IPv6 literal target would need ATYP_IPV6 - nobody has asked yet.
                const target = isIPv4(options.host)
                    ? Buffer.from([ATYP_IPV4, ...options.host.split('.').map(Number)])
                    : Buffer.concat([Buffer.from([ATYP_DOMAIN, hostname.length]), hostname])
                socket.write(Buffer.concat([Buffer.from([SOCKS_VERSION, CMD_CONNECT, 0x00]), target, port]))
            }

            // Only the reply step is left: the steps above either returned or
            // advanced into this one.
            if (buffer.length < 5) {
                return
            }
            const replyLength = buffer[3] === ATYP_IPV4 ? 10 : buffer[3] === ATYP_IPV6 ? 22 : 7 + buffer[4]
            if (buffer.length < replyLength) {
                return
            }
            if (buffer[1] !== 0x00) {
                fail(`SOCKS proxy refused the connection: ${REPLY_ERRORS[buffer[1]] ?? `error 0x${buffer[1].toString(16)}`}`)
                return
            }
            socket.removeListener('data', onData)
            // Removing the listener doesn't leave flowing mode, and the target may
            // already have sent its banner - pause before anything can be dropped.
            socket.pause()
            if (buffer.length > replyLength) {
                socket.unshift(buffer.subarray(replyLength))
            }
            resolve(socket)
        })
    })
}

/**
 * Serves an already connected socket over a single-use localhost listener and
 * resolves to its `host:port`, so a transport that can only dial an address of
 * its own can be handed a socket someone else opened.
 */
export function createOneShotRelay (socket: Socket): Promise<string> {
    return new Promise((resolve, reject) => {
        const relay = createServer(local => {
            relay.close()
            socket.pipe(local).pipe(socket)
            local.on('error', () => socket.destroy()).on('close', () => socket.destroy())
            socket.on('close', () => local.destroy())
        })
        relay.on('error', reject)
        relay.listen(0, '127.0.0.1', () => {
            const address = relay.address()
            if (typeof address === 'string' || address === null) {
                relay.close()
                reject(new Error('Could not open a local relay port'))
                return
            }
            resolve(`127.0.0.1:${address.port}`)
        })
    })
}
