import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer, connect } from 'node:net'
import type { AddressInfo, Server, Socket } from 'node:net'
import { connectThroughSocks5, createOneShotRelay } from '../src/session/socksProxy.ts'

const CREDENTIALS = { username: 'alice', password: 'p@ss w0rd' }

const openServers: Server[] = []
const openSockets: Socket[] = []

test.after(() => {
    for (const socket of openSockets) {
        socket.destroy()
    }
    for (const server of openServers) {
        server.close()
    }
})

interface ProxyOptions {
    refuseAuthMethod?: boolean
    replyCode?: number
}

interface ProxyRequest {
    methods?: number[]
    username?: string
    password?: string
    addressType?: number
    target?: string
    port?: number
}

// Unref'd so a forgotten listener can't keep the test process alive; an
// incoming connection is still accepted while the loop is busy elsewhere.
const listen = (server: Server): Promise<number> =>
    new Promise(resolve => server.listen(0, '127.0.0.1', () => {
        server.unref()
        resolve((server.address() as AddressInfo).port)
    }))

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * A SOCKS5 proxy that deliberately splits the method reply across packets and
 * glues the connect reply onto the target's first bytes - both cases a reader
 * that assumes one packet per step gets wrong.
 */
function fakeProxy (options: ProxyOptions = {}) {
    const request: ProxyRequest = {}
    const server = createServer(client => {
        openSockets.push(client)
        let buffer = Buffer.alloc(0)
        let step = 0
        client.on('data', chunk => {
            buffer = Buffer.concat([buffer, chunk])
            if (step === 0) {
                if (buffer.length < 2 || buffer.length < 2 + buffer[1]) {
                    return
                }
                request.methods = [...buffer.subarray(2, 2 + buffer[1])]
                buffer = buffer.subarray(2 + buffer[1])
                step = 1
                if (options.refuseAuthMethod) {
                    client.end(Buffer.from([0x05, 0xff]))
                    return
                }
                client.write(Buffer.from([0x05]))
                setTimeout(() => client.write(Buffer.from([0x02])), 20)
            }
            if (step === 1) {
                if (buffer.length < 2) {
                    return
                }
                const usernameLength = buffer[1]
                if (buffer.length < 3 + usernameLength) {
                    return
                }
                const passwordLength = buffer[2 + usernameLength]
                if (buffer.length < 3 + usernameLength + passwordLength) {
                    return
                }
                request.username = buffer.subarray(2, 2 + usernameLength).toString()
                request.password = buffer.subarray(3 + usernameLength, 3 + usernameLength + passwordLength).toString()
                buffer = buffer.subarray(3 + usernameLength + passwordLength)
                step = 2
                const accepted = request.username === CREDENTIALS.username && request.password === CREDENTIALS.password
                client.write(Buffer.from([0x01, accepted ? 0x00 : 0x01]))
                if (!accepted) {
                    step = 9
                    client.end()
                }
            }
            if (step === 2) {
                if (buffer.length < 5) {
                    return
                }
                request.addressType = buffer[3]
                const addressLength = buffer[3] === 0x01 ? 4 : buffer[3] === 0x04 ? 16 : 1 + buffer[4]
                if (buffer.length < 6 + addressLength) {
                    return
                }
                const address = buffer.subarray(buffer[3] === 0x03 ? 5 : 4, 4 + addressLength)
                request.target = buffer[3] === 0x01 ? [...address].join('.') : address.toString()
                request.port = buffer.readUInt16BE(4 + addressLength)
                step = 3
                const reply = Buffer.from([0x05, options.replyCode ?? 0x00, 0x00, 0x01, 127, 0, 0, 1, 0x04, 0x38])
                if (options.replyCode) {
                    step = 9
                    client.end(reply)
                    return
                }
                const upstream = connect(request.port, '127.0.0.1')
                openSockets.push(upstream)
                upstream.once('data', first => {
                    client.write(Buffer.concat([reply, first]))
                    upstream.pipe(client).pipe(upstream)
                })
                upstream.on('error', () => client.destroy())
            }
        })
        client.on('error', () => { /* the test closes sockets abruptly */ })
    })
    return { server, request }
}

/** A target that greets immediately, then echoes - like an SSH server's banner. */
const startTarget = (): Promise<number> => listen(createServer((socket: Socket) => {
    socket.write('SSH-2.0-Fake\r\n')
    socket.pipe(socket)
}))

async function throughProxy (host: string, credentials = CREDENTIALS, options: ProxyOptions = {}) {
    const targetPort = await startTarget()
    const proxy = fakeProxy(options)
    openServers.push(proxy.server)
    const proxyPort = await listen(proxy.server)
    try {
        const socket: Socket = await connectThroughSocks5({
            proxyHost: '127.0.0.1',
            proxyPort,
            host,
            port: targetPort,
            ...credentials,
        })
        openSockets.push(socket)
        return { socket, request: proxy.request, targetPort }
    } finally {
        proxy.server.close()
    }
}

async function readThroughRelay (socket: Socket): Promise<string> {
    const [host, port] = (await createOneShotRelay(socket)).split(':')
    // The target has already spoken: a late reader must still see its greeting.
    await sleep(200)
    const client = connect(Number(port), host)
    openSockets.push(client)
    let received = ''
    client.on('data', chunk => { received += chunk })
    client.write('ping')
    await sleep(200)
    client.end()
    return received
}

test('authenticates, resolves names at the proxy and relays both directions', async () => {
    const { socket, request, targetPort } = await throughProxy('  localhost  ')
    assert.deepEqual(request.methods, [0x02])
    assert.equal(request.username, CREDENTIALS.username)
    assert.equal(request.password, CREDENTIALS.password)
    assert.equal(request.addressType, 0x03)
    assert.equal(request.target, '  localhost  ')
    assert.equal(request.port, targetPort)
    assert.equal(await readThroughRelay(socket), 'SSH-2.0-Fake\r\nping')
})

test('sends an IPv4 target as an address rather than a name', async () => {
    const { socket, request } = await throughProxy('127.0.0.1')
    assert.equal(request.addressType, 0x01)
    assert.equal(request.target, '127.0.0.1')
    assert.equal(await readThroughRelay(socket), 'SSH-2.0-Fake\r\nping')
})

test('reports a rejected password', async () => {
    await assert.rejects(
        throughProxy('localhost', { username: 'alice', password: 'wrong' }),
        /rejected the username\/password/,
    )
})

test('reports a proxy that will not do username/password auth', async () => {
    await assert.rejects(
        throughProxy('localhost', CREDENTIALS, { refuseAuthMethod: true }),
        /rejected username\/password authentication/,
    )
})

test('reports a SOCKS reply code in words', async () => {
    await assert.rejects(
        throughProxy('localhost', CREDENTIALS, { replyCode: 0x05 }),
        /connection refused/,
    )
})
