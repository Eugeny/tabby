import colors from 'ansi-colors'
import { Duplex } from 'stream'
import { Injectable, NgZone } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Client } from 'ssh2'
import { exec } from 'child_process'
import { Subject, Observable } from 'rxjs'
import { Logger, LogService, ConfigService, NotificationsService, HostAppService, Platform, PlatformService, PromptModalComponent } from 'tabby-core'
import { ALGORITHM_BLACKLIST, ForwardedPort, SSHAlgorithmType, SSHProfile, SSHSession } from '../api'
import { PasswordStorageService } from './passwordStorage.service'
import { ChildProcess } from 'node:child_process'

@Injectable({ providedIn: 'root' })
export class SSHService {
    private logger: Logger
    private detectedWinSCPPath: string | null

    private constructor (
        log: LogService,
        private zone: NgZone,
        private ngbModal: NgbModal,
        private passwordStorage: PasswordStorageService,
        private notifications: NotificationsService,
        private config: ConfigService,
        hostApp: HostAppService,
        private platform: PlatformService,
    ) {
        this.logger = log.create('ssh')
        if (hostApp.platform === Platform.Windows) {
            this.detectedWinSCPPath = platform.getWinSCPPath()
        }
    }

    async connectSession (session: SSHSession): Promise<void> {
        const log = (s: any) => session.emitServiceMessage(s)

        const ssh = new Client()
        session.ssh = ssh
        await session.init()

        let connected = false
        const algorithms = {}
        for (const key of Object.values(SSHAlgorithmType)) {
            algorithms[key] = session.profile.options.algorithms![key].filter(x => !ALGORITHM_BLACKLIST.includes(x))
        }

        const resultPromise: Promise<void> = new Promise(async (resolve, reject) => {
            ssh.on('ready', () => {
                connected = true
                if (session.savedPassword) {
                    this.passwordStorage.savePassword(session.profile, session.savedPassword)
                }

                for (const fw of session.profile.options.forwardedPorts ?? []) {
                    session.addPortForward(Object.assign(new ForwardedPort(), fw))
                }

                this.zone.run(resolve)
            })
            ssh.on('handshake', negotiated => {
                this.logger.info('Handshake complete:', negotiated)
            })
            ssh.on('error', error => {
                if (error.message === 'All configured authentication methods failed') {
                    this.passwordStorage.deletePassword(session.profile)
                }
                this.zone.run(() => {
                    if (connected) {
                        // eslint-disable-next-line @typescript-eslint/no-base-to-string
                        this.notifications.error(error.toString())
                    } else {
                        reject(error)
                    }
                })
            })
            ssh.on('close', () => {
                if (session.open) {
                    session.destroy()
                }
            })

            ssh.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => this.zone.run(async () => {
                log(colors.bgBlackBright(' ') + ` Keyboard-interactive auth requested: ${name}`)
                this.logger.info('Keyboard-interactive auth:', name, instructions, instructionsLang)
                const results: string[] = []
                for (const prompt of prompts) {
                    const modal = this.ngbModal.open(PromptModalComponent)
                    modal.componentInstance.prompt = prompt.prompt
                    modal.componentInstance.password = !prompt.echo

                    try {
                        const result = await modal.result
                        results.push(result ? result.value : '')
                    } catch {
                        results.push('')
                    }
                }
                finish(results)
            }))

            ssh.on('greeting', greeting => {
                if (!session.profile.options.skipBanner) {
                    log('Greeting: ' + greeting)
                }
            })

            ssh.on('banner', banner => {
                if (!session.profile.options.skipBanner) {
                    log(banner)
                }
            })
        })

        try {
            if (session.profile.options.proxyCommand) {
                session.emitServiceMessage(colors.bgBlue.black(' Proxy command ') + ` Using ${session.profile.options.proxyCommand}`)
                session.proxyCommandStream = new ProxyCommandStream(session.profile.options.proxyCommand)

                session.proxyCommandStream.output$.subscribe((message: string) => {
                    session.emitServiceMessage(colors.bgBlue.black(' Proxy command ') + ' ' + message.trim())
                })

                await session.proxyCommandStream.start()
            }

            ssh.connect({
                host: session.profile.options.host.trim(),
                port: session.profile.options.port ?? 22,
                sock: session.proxyCommandStream ?? session.jumpStream,
                username: session.profile.options.user,
                tryKeyboard: true,
                agent: session.agentPath,
                agentForward: session.profile.options.agentForward && !!session.agentPath,
                keepaliveInterval: session.profile.options.keepaliveInterval ?? 15000,
                keepaliveCountMax: session.profile.options.keepaliveCountMax,
                readyTimeout: session.profile.options.readyTimeout,
                hostVerifier: (digest: string) => {
                    log('Host key fingerprint:')
                    log(colors.white.bgBlack(' SHA256 ') + colors.bgBlackBright(' ' + digest + ' '))
                    return true
                },
                hostHash: 'sha256' as any,
                algorithms,
                authHandler: (methodsLeft, partialSuccess, callback) => {
                    this.zone.run(async () => {
                        callback(await session.handleAuth(methodsLeft))
                    })
                },
            })
        } catch (e) {
            this.notifications.error(e.message)
            throw e
        }

        return resultPromise
    }

    getWinSCPPath (): string|undefined {
        return this.detectedWinSCPPath ?? this.config.store.ssh.winSCPPath
    }

    async getWinSCPURI (profile: SSHProfile, cwd?: string): Promise<string> {
        let uri = `scp://${profile.options.user}`
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
        const args = [await this.getWinSCPURI(session.profile)]
        if (session.activePrivateKey) {
            args.push('/privatekey')
            args.push(session.activePrivateKey)
        }
        this.platform.exec(path, args)
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
        this.process = exec(this.command, {
            windowsHide: true,
            encoding: 'buffer',
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
        process.stdout.read(size)
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
