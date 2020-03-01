import colors from 'ansi-colors'
import { BaseSession } from 'terminus-terminal'
import { Server, Socket, createServer, createConnection } from 'net'
import { Client, ClientChannel } from 'ssh2'
import { Logger } from 'terminus-core'
import { Subject, Observable } from 'rxjs'

export interface LoginScript {
    expect: string
    send: string
    isRegex?: boolean
    optional?: boolean
}

export enum SSHAlgorithmType {
    HMAC = 'hmac',
    KEX = 'kex',
    CIPHER = 'cipher',
    HOSTKEY = 'serverHostKey'
}

export interface SSHConnection {
    name: string
    host: string
    port: number
    user: string
    password?: string
    privateKey?: string
    group: string | null
    scripts?: LoginScript[]
    keepaliveInterval?: number
    keepaliveCountMax?: number
    readyTimeout?: number
    color?: string
    x11?: boolean
    skipBanner?: boolean

    algorithms?: {[t: string]: string[]}
}

export enum PortForwardType {
    Local, Remote
}

export class ForwardedPort {
    type: PortForwardType
    host = '127.0.0.1'
    port: number
    targetAddress: string
    targetPort: number

    private listener: Server

    async startLocalListener (callback: (Socket) => void): Promise<void> {
        this.listener = createServer(callback)
        return new Promise((resolve, reject) => {
            this.listener.listen(this.port, '127.0.0.1')
            this.listener.on('error', reject)
            this.listener.on('listening', resolve)
        })
    }

    stopLocalListener (): void {
        this.listener.close()
    }

    toString (): string {
        if (this.type === PortForwardType.Local) {
            return `(local) ${this.host}:${this.port} → (remote) ${this.targetAddress}:${this.targetPort}`
        } else {
            return `(remote) ${this.host}:${this.port} → (local) ${this.targetAddress}:${this.targetPort}`
        }
    }
}

export class SSHSession extends BaseSession {
    scripts?: LoginScript[]
    shell: ClientChannel
    ssh: Client
    forwardedPorts: ForwardedPort[] = []
    logger: Logger

    get serviceMessage$ (): Observable<string> { return this.serviceMessage }
    private serviceMessage = new Subject<string>()

    constructor (public connection: SSHConnection) {
        super()
        this.scripts = connection.scripts || []
    }

    async start (): Promise<void> {
        this.open = true

        try {
            this.shell = await this.openShellChannel({ x11: this.connection.x11 })
        } catch (err) {
            this.emitServiceMessage(colors.bgRed.black(' X ') + ` Remote rejected opening a shell channel: ${err}`)
        }

        this.shell.on('greeting', greeting => {
            this.emitServiceMessage(`Shell greeting: ${greeting}`)
        })

        this.shell.on('banner', banner => {
            this.emitServiceMessage(`Shell banner: ${banner}`)
        })

        this.shell.on('data', data => {
            const dataString = data.toString()
            this.emitOutput(data)

            if (this.scripts) {
                let found = false
                for (const script of this.scripts) {
                    let match = false
                    let cmd = ''
                    if (script.isRegex) {
                        const re = new RegExp(script.expect, 'g')
                        if (dataString.match(re)) {
                            cmd = dataString.replace(re, script.send)
                            match = true
                            found = true
                        }
                    } else {
                        if (dataString.includes(script.expect)) {
                            cmd = script.send
                            match = true
                            found = true
                        }
                    }

                    if (match) {
                        this.logger.info('Executing script: "' + cmd + '"')
                        this.shell.write(cmd + '\n')
                        this.scripts = this.scripts.filter(x => x !== script)
                    } else {
                        if (script.optional) {
                            this.logger.debug('Skip optional script: ' + script.expect)
                            found = true
                            this.scripts = this.scripts.filter(x => x !== script)
                        } else {
                            break
                        }
                    }
                }

                if (found) {
                    this.executeUnconditionalScripts()
                }
            }
        })

        this.shell.on('end', () => {
            this.logger.info('Shell session ended')
            if (this.open) {
                this.destroy()
            }
        })

        this.ssh.on('tcp connection', (details, accept, reject) => {
            this.logger.info(`Incoming forwarded connection: (remote) ${details.srcIP}:${details.srcPort} -> (local) ${details.destIP}:${details.destPort}`)
            const forward = this.forwardedPorts.find(x => x.port === details.destPort)
            if (!forward) {
                this.emitServiceMessage(colors.bgRed.black(' X ') + ` Rejected incoming forwarded connection for unrecognized port ${details.destPort}`)
                return reject()
            }
            const socket = new Socket()
            socket.connect(forward.targetPort, forward.targetAddress)
            socket.on('error', e => {
                this.emitServiceMessage(colors.bgRed.black(' X ') + ` Could not forward the remote connection to ${forward.targetAddress}:${forward.targetPort}: ${e}`)
                reject()
            })
            socket.on('connect', () => {
                this.logger.info('Connection forwarded')
                const stream = accept()
                stream.pipe(socket)
                socket.pipe(stream)
                stream.on('close', () => {
                    socket.destroy()
                })
                socket.on('close', () => {
                    stream.close()
                })
            })
        })

        this.ssh.on('x11', (details, accept, reject) => {
            this.logger.info(`Incoming X11 connection from ${details.srcIP}:${details.srcPort}`)
            let displaySpec = process.env.DISPLAY || ':0'
            this.logger.debug(`Trying display ${displaySpec}`)
            let xHost = displaySpec.split(':')[0]
            let xDisplay = parseInt(displaySpec.split(':')[1].split('.')[0] || '0')
            let xPort = xDisplay < 100 ? xDisplay + 6000 : xDisplay

            const socket = displaySpec.startsWith('/') ? createConnection(displaySpec) : new Socket()
            if (!displaySpec.startsWith('/')) {
                socket.connect(xPort, xHost)
            }
            socket.on('error', e => {
                this.emitServiceMessage(colors.bgRed.black(' X ') + ` Could not connect to the X server ${xHost}:${xPort}: ${e}`)
                reject()
            })
            socket.on('connect', () => {
                this.logger.info('Connection forwarded')
                const stream = accept()
                stream.pipe(socket)
                socket.pipe(stream)
                stream.on('close', () => {
                    socket.destroy()
                })
                socket.on('close', () => {
                    stream.close()
                })
            })
        })

        this.executeUnconditionalScripts()
    }

    emitServiceMessage (msg: string): void {
        this.serviceMessage.next(msg)
        this.logger.info(msg)
    }

    async addPortForward (fw: ForwardedPort): Promise<void> {
        if (fw.type === PortForwardType.Local) {
            await fw.startLocalListener((socket: Socket) => {
                this.logger.info(`New connection on ${fw}`)
                this.ssh.forwardOut(
                    socket.remoteAddress || '127.0.0.1',
                    socket.remotePort || 0,
                    fw.targetAddress,
                    fw.targetPort,
                    (err, stream) => {
                        if (err) {
                            this.emitServiceMessage(colors.bgRed.black(' X ') + ` Remote has rejected the forwaded connection via ${fw}: ${err}`)
                            socket.destroy()
                            return
                        }
                        stream.pipe(socket)
                        socket.pipe(stream)
                        stream.on('close', () => {
                            socket.destroy()
                        })
                        socket.on('close', () => {
                            stream.close()
                        })
                    }
                )
            }).then(() => {
                this.emitServiceMessage(colors.bgGreen.black(' -> ') + ` Forwaded ${fw}`)
                this.forwardedPorts.push(fw)
            }).catch(e => {
                this.emitServiceMessage(colors.bgRed.black(' X ') + ` Failed to forward port ${fw}: ${e}`)
                throw e
            })
        }
        if (fw.type === PortForwardType.Remote) {
            await new Promise((resolve, reject) => {
                this.ssh.forwardIn(fw.host, fw.port, err => {
                    if (err) {
                        this.emitServiceMessage(colors.bgRed.black(' X ') + ` Remote rejected port forwarding for ${fw}: ${err}`)
                        return reject(err)
                    }
                    resolve()
                })
            })
            this.emitServiceMessage(colors.bgGreen.black(' <- ') + ` Forwaded ${fw}`)
            this.forwardedPorts.push(fw)
        }
    }

    async removePortForward (fw: ForwardedPort): Promise<void> {
        if (fw.type === PortForwardType.Local) {
            fw.stopLocalListener()
            this.forwardedPorts = this.forwardedPorts.filter(x => x !== fw)
        }
        if (fw.type === PortForwardType.Remote) {
            this.ssh.unforwardIn(fw.host, fw.port)
            this.forwardedPorts = this.forwardedPorts.filter(x => x !== fw)
        }
        this.emitServiceMessage(`Stopped forwarding ${fw}`)
    }

    resize (columns: number, rows: number): void {
        if (this.shell) {
            this.shell.setWindow(rows, columns, rows, columns)
        }
    }

    write (data: Buffer): void {
        if (this.shell) {
            this.shell.write(data.toString())
        }
    }

    kill (signal?: string): void {
        if (this.shell) {
            this.shell.signal(signal || 'TERM')
        }
    }

    async destroy (): Promise<void> {
        this.serviceMessage.complete()
        await super.destroy()
    }

    async getChildProcesses (): Promise<any[]> {
        return []
    }

    async gracefullyKillProcess (): Promise<void> {
        this.kill('TERM')
    }

    async getWorkingDirectory (): Promise<string|null> {
        return null
    }

    private openShellChannel (options): Promise<ClientChannel> {
        return new Promise<ClientChannel>((resolve, reject) => {
            this.ssh.shell({ term: 'xterm-256color' }, options, (err, shell) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(shell)
                }
            })
        })
    }

    private executeUnconditionalScripts () {
        if (this.scripts) {
            for (const script of this.scripts) {
                if (!script.expect) {
                    console.log('Executing script:', script.send)
                    this.shell.write(script.send + '\n')
                    this.scripts = this.scripts.filter(x => x !== script)
                } else {
                    break
                }
            }
        }
    }
}

export interface SSHConnectionGroup {
    name: string
    connections: SSHConnection[]
}
