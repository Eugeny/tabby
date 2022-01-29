import * as shellQuote from 'shell-quote'
import socksv5 from '@luminati-io/socksv5'
import { Duplex } from 'stream'
import { Injectable } from '@angular/core'
import { spawn } from 'child_process'
import { ChildProcess } from 'node:child_process'
import { Subject, Observable } from 'rxjs'
import { ConfigService, HostAppService, Platform, PlatformService } from 'tabby-core'
import { SSHSession } from '../session/ssh'
import { SSHProfile } from '../api'
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

export class SocksProxyStream extends Duplex {
    private client: Duplex|null
    private header: Buffer|null

    constructor (private profile: SSHProfile) {
        super({
            allowHalfOpen: false,
        })
    }

    async start (): Promise<void> {
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
                    this.push(this.header)
                }
            })
            connector.on('error', (err) => {
                reject(err)
                this.destroy(err)
            })
        })
        this.client?.on('data', data => {
            if (!this.header || data !== this.header) {
                // socksv5 doesn't reliably emit the first data event
                this.push(data)
                this.header = null
            }
        })
        this.client?.on('close', (err) => {
            this.destroy(err)
        })
    }

    _read (size: number): void {
        this.client?.read(size)
    }

    _write (chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void): void {
        this.client?.write(chunk, callback)
    }

    _destroy (error: Error|null, callback: (error: Error|null) => void): void {
        this.client?.destroy()
        callback(error)
    }
}


export class ProxyCommandStream extends Duplex {
    private process: ChildProcess

    get output$ (): Observable<string> { return this.output }
    private output = new Subject<string>()

    constructor (private command: string) {
        super({
            allowHalfOpen: false,
        })
    }

    async start (): Promise<void> {
        const argv = shellQuote.parse(this.command)
        this.process = spawn(argv[0], argv.slice(1), {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'ignore'],
        })
        this.process.on('error', error => {
            this.destroy(new Error(`Proxy command has failed to start: ${error.message}`))
        })
        this.process.on('exit', code => {
            this.destroy(new Error(`Proxy command has exited with code ${code}`))
        })
        this.process.stdout?.on('data', data => {
            this.push(data)
        })
        this.process.stdout?.on('error', (err) => {
            this.destroy(err)
        })
        this.process.stderr?.on('data', data => {
            this.output.next(data.toString())
        })
    }

    _read (size: number): void {
        this.process.stdout?.read(size)
    }

    _write (chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void): void {
        this.process.stdin?.write(chunk, callback)
    }

    _destroy (error: Error|null, callback: (error: Error|null) => void): void {
        this.process.kill()
        this.output.complete()
        callback(error)
    }
}
