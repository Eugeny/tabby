import * as shellQuote from 'shell-quote'
import * as net from 'net'
import socksv5 from '@luminati-io/socksv5'
import { Duplex } from 'stream'
import { Injectable } from '@angular/core'
import { spawn } from 'child_process'
import { ChildProcess } from 'node:child_process'
import { ConfigService, HostAppService, Platform, PlatformService } from 'tabby-core'
import { SSHSession } from '../session/ssh'
import { SSHProfile, SSHProxyStream, SSHProxyStreamSocket } from '../api'
import { PasswordStorageService } from './passwordStorage.service'

@Injectable({ providedIn: 'root' })
export class SSHService {
    private detectedWinSCPPath: string | null

    private constructor (
        private passwordStorage: PasswordStorageService,
        private config: ConfigService,
        hostApp: HostAppService,
        private platform: PlatformService,
    ) {
        if (hostApp.platform === Platform.Windows) {
            this.detectedWinSCPPath = platform.getWinSCPPath()
        }
    }

    getWinSCPPath (): string|undefined {
        return this.detectedWinSCPPath ?? this.config.store.ssh.winSCPPath
    }

    async getWinSCPURI (profile: SSHProfile, cwd?: string, username?: string): Promise<string> {
        let uri = `scp://${username ?? profile.options.user}`
        const password = await this.passwordStorage.loadPassword(profile)
        if (password) {
            uri += ':' + encodeURIComponent(password)
        }
        uri += `@${profile.options.host}:${profile.options.port}${cwd ?? '/'}`
        return uri
    }

    async launchWinSCP (session: SSHSession): Promise<void> {
        const path = this.getWinSCPPath()
        if (!path) {
            return
        }
        const args = [await this.getWinSCPURI(session.profile, undefined, session.authUsername ?? undefined)]
        if (session.activePrivateKey) {
            args.push('/privatekey')
            args.push(session.activePrivateKey)
        }
        this.platform.exec(path, args)
    }
}

export class ProxyCommandStream extends SSHProxyStream {
    private process: ChildProcess|null

    constructor (private command: string) {
        super()
    }

    async start (): Promise<SSHProxyStreamSocket> {
        const argv = shellQuote.parse(this.command)
        this.process = spawn(argv[0], argv.slice(1), {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
        })
        this.process.on('error', error => {
            this.stop(new Error(`Proxy command has failed to start: ${error.message}`))
        })
        this.process.on('exit', code => {
            this.stop(new Error(`Proxy command has exited with code ${code}`))
        })
        this.process.stdout?.on('data', data => {
            this.emitOutput(data)
        })
        this.process.stdout?.on('error', (err) => {
            this.stop(err)
        })
        this.process.stderr?.on('data', data => {
            this.emitMessage(data.toString())
        })
        return super.start()
    }

    requestData (size: number): void {
        this.process?.stdout?.read(size)
    }

    async consumeInput (data: Buffer): Promise<void> {
        const process = this.process
        if (process) {
            await new Promise(resolve => process.stdin?.write(data, resolve))
        }
    }

    async stop (error?: Error): Promise<void> {
        this.process?.kill()
        super.stop(error)
    }
}

export class SocksProxyStream extends SSHProxyStream {
    private client: Duplex|null
    private header: Buffer|null

    constructor (private profile: SSHProfile) {
        super()
    }

    async start (): Promise<SSHProxyStreamSocket> {
        this.client = await new Promise((resolve, reject) => {
            const connector = socksv5.connect({
                host: this.profile.options.host,
                port: this.profile.options.port,
                proxyHost: this.profile.options.socksProxyHost ?? '127.0.0.1',
                proxyPort: this.profile.options.socksProxyPort ?? 5000,
                auths: [socksv5.auth.None()],
            }, s => {
                resolve(s)
                this.header = s.read()
                if (this.header) {
                    this.emitOutput(this.header)
                }
            })
            connector.on('error', (err) => {
                reject(err)
                this.stop(new Error(`SOCKS connection failed: ${err.message}`))
            })
        })
        this.client?.on('data', data => {
            if (!this.header || data !== this.header) {
                // socksv5 doesn't reliably emit the first data event
                this.emitOutput(data)
                this.header = null
            }
        })
        this.client?.on('close', error => {
            this.stop(error)
        })

        return super.start()
    }

    requestData (size: number): void {
        this.client?.read(size)
    }

    async consumeInput (data: Buffer): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client?.write(data, undefined, err => err ? reject(err) : resolve())
        })
    }

    async stop (error?: Error): Promise<void> {
        this.client?.destroy()
        super.stop(error)
    }
}

export class HTTPProxyStream extends SSHProxyStream {
    private client: Duplex|null
    private connected = false

    constructor (private profile: SSHProfile) {
        super()
    }

    async start (): Promise<SSHProxyStreamSocket> {
        this.client = await new Promise((resolve, reject) => {
            const connector = net.createConnection({
                host: this.profile.options.httpProxyHost!,
                port: this.profile.options.httpProxyPort!,
            }, () => resolve(connector))
            connector.on('error', error => {
                reject(error)
                this.stop(new Error(`Proxy connection failed: ${error.message}`))
            })
        })
        this.client?.write(Buffer.from(`CONNECT ${this.profile.options.host}:${this.profile.options.port} HTTP/1.1\r\n\r\n`))
        this.client?.on('data', (data: Buffer) => {
            if (this.connected) {
                this.emitOutput(data)
            } else {
                if (data.slice(0, 5).equals(Buffer.from('HTTP/'))) {
                    const idx = data.indexOf('\n\n')
                    const headers = data.slice(0, idx).toString()
                    const code = parseInt(headers.split(' ')[1])
                    if (code >= 200 && code < 300) {
                        this.emitMessage('Connected')
                        this.emitOutput(data.slice(idx + 2))
                        this.connected = true
                    } else {
                        this.stop(new Error(`Connection failed, code ${code}`))
                    }
                }
            }
        })
        this.client?.on('close', error => {
            this.stop(error)
        })

        return super.start()
    }

    requestData (size: number): void {
        this.client?.read(size)
    }

    async consumeInput (data: Buffer): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client?.write(data, undefined, err => err ? reject(err) : resolve())
        })
    }

    async stop (error?: Error): Promise<void> {
        this.client?.destroy()
        super.stop(error)
    }
}
