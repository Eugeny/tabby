import colors from 'ansi-colors'
import { Duplex } from 'stream'
import { Injectable, Injector, NgZone } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Client } from 'ssh2'
import { exec } from 'child_process'
import { Subject, Observable } from 'rxjs'
import { Logger, LogService, AppService, SelectorOption, ConfigService, NotificationsService, HostAppService, Platform, PlatformService } from 'terminus-core'
import { SettingsTabComponent } from 'terminus-settings'
import { ALGORITHM_BLACKLIST, ForwardedPort, SSHConnection, SSHSession } from '../api'
import { PromptModalComponent } from '../components/promptModal.component'
import { PasswordStorageService } from './passwordStorage.service'
import { SSHTabComponent } from '../components/sshTab.component'
import { ChildProcess } from 'node:child_process'

@Injectable({ providedIn: 'root' })
export class SSHService {
    private logger: Logger
    private detectedWinSCPPath: string | null

    private constructor (
        private injector: Injector,
        private log: LogService,
        private zone: NgZone,
        private ngbModal: NgbModal,
        private passwordStorage: PasswordStorageService,
        private notifications: NotificationsService,
        private app: AppService,
        private config: ConfigService,
        hostApp: HostAppService,
        private platform: PlatformService,
    ) {
        this.logger = log.create('ssh')
        if (hostApp.platform === Platform.Windows) {
            this.detectedWinSCPPath = platform.getWinSCPPath()
        }
    }

    createSession (connection: SSHConnection): SSHSession {
        const session = new SSHSession(this.injector, connection)
        session.logger = this.log.create(`ssh-${connection.host}-${connection.port}`)
        return session
    }

    async connectSession (session: SSHSession): Promise<void> {
        const log = (s: any) => session.emitServiceMessage(s)

        const ssh = new Client()
        session.ssh = ssh
        await session.init()

        let connected = false
        const algorithms = {}
        for (const key of Object.keys(session.connection.algorithms ?? {})) {
            algorithms[key] = session.connection.algorithms![key].filter(x => !ALGORITHM_BLACKLIST.includes(x))
        }

        const resultPromise: Promise<void> = new Promise(async (resolve, reject) => {
            ssh.on('ready', () => {
                connected = true
                if (session.savedPassword) {
                    this.passwordStorage.savePassword(session.connection, session.savedPassword)
                }

                for (const fw of session.connection.forwardedPorts ?? []) {
                    session.addPortForward(Object.assign(new ForwardedPort(), fw))
                }

                this.zone.run(resolve)
            })
            ssh.on('handshake', negotiated => {
                this.logger.info('Handshake complete:', negotiated)
            })
            ssh.on('error', error => {
                if (error.message === 'All configured authentication methods failed') {
                    this.passwordStorage.deletePassword(session.connection)
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
                if (!session.connection.skipBanner) {
                    log('Greeting: ' + greeting)
                }
            })

            ssh.on('banner', banner => {
                if (!session.connection.skipBanner) {
                    log(banner)
                }
            })
        })

        try {
            if (session.connection.proxyCommand) {
                session.emitServiceMessage(colors.bgBlue.black(' Proxy command ') + ` Using ${session.connection.proxyCommand}`)
                session.proxyCommandStream = new ProxyCommandStream(session.connection.proxyCommand)

                session.proxyCommandStream.output$.subscribe((message: string) => {
                    session.emitServiceMessage(colors.bgBlue.black(' Proxy command ') + ' ' + message.trim())
                })

                await session.proxyCommandStream.start()
            }

            ssh.connect({
                host: session.connection.host.trim(),
                port: session.connection.port ?? 22,
                sock: session.proxyCommandStream ?? session.jumpStream,
                username: session.connection.user,
                tryKeyboard: true,
                agent: session.agentPath,
                agentForward: session.connection.agentForward && !!session.agentPath,
                keepaliveInterval: session.connection.keepaliveInterval ?? 15000,
                keepaliveCountMax: session.connection.keepaliveCountMax,
                readyTimeout: session.connection.readyTimeout,
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
            } as any)
        } catch (e) {
            this.notifications.error(e.message)
            throw e
        }

        return resultPromise
    }

    async showConnectionSelector (): Promise<void> {
        const options: SelectorOption<void>[] = []
        const recentConnections = this.config.store.ssh.recentConnections

        for (const connection of recentConnections) {
            options.push({
                name: connection.name,
                description: connection.host,
                icon: 'history',
                callback: () => this.connect(connection),
            })
        }

        if (recentConnections.length) {
            options.push({
                name: 'Clear recent connections',
                icon: 'eraser',
                callback: () => {
                    this.config.store.ssh.recentConnections = []
                    this.config.save()
                },
            })
        }

        const groups: { name: string, connections: SSHConnection[] }[] = []
        const connections = this.config.store.ssh.connections
        for (const connection of connections) {
            connection.group = connection.group || null
            let group = groups.find(x => x.name === connection.group)
            if (!group) {
                group = {
                    name: connection.group!,
                    connections: [],
                }
                groups.push(group)
            }
            group.connections.push(connection)
        }

        for (const group of groups) {
            for (const connection of group.connections) {
                options.push({
                    name: (group.name ? `${group.name} / ` : '') + connection.name,
                    description: connection.host,
                    icon: 'desktop',
                    callback: () => this.connect(connection),
                })
            }
        }

        options.push({
            name: 'Manage connections',
            icon: 'cog',
            callback: () => this.app.openNewTabRaw(SettingsTabComponent, { activeTab: 'ssh' }),
        })

        options.push({
            name: 'Quick connect',
            freeInputPattern: 'Connect to "%s"...',
            icon: 'arrow-right',
            callback: query => this.quickConnect(query),
        })


        await this.app.showSelector('Open an SSH connection', options)
    }

    async connect (connection: SSHConnection): Promise<SSHTabComponent> {
        try {
            const tab = this.app.openNewTab(
                SSHTabComponent,
                { connection }
            ) as SSHTabComponent
            if (connection.color) {
                (this.app.getParentTab(tab) ?? tab).color = connection.color
            }

            setTimeout(() => this.app.activeTab?.emitFocused())

            return tab
        } catch (error) {
            this.notifications.error(`Could not connect: ${error}`)
            throw error
        }
    }

    quickConnect (query: string): Promise<SSHTabComponent> {
        let user = 'root'
        let host = query
        let port = 22
        if (host.includes('@')) {
            const parts = host.split(/@/g)
            host = parts[parts.length - 1]
            user = parts.slice(0, parts.length - 1).join('@')
        }
        if (host.includes(':')) {
            port = parseInt(host.split(':')[1])
            host = host.split(':')[0]
        }

        const connection: SSHConnection = {
            name: query,
            group: null,
            host,
            user,
            port,
        }

        const recentConnections = this.config.store.ssh.recentConnections
        recentConnections.unshift(connection)
        if (recentConnections.length > 5) {
            recentConnections.pop()
        }
        this.config.store.ssh.recentConnections = recentConnections
        this.config.save()
        return this.connect(connection)
    }

    getWinSCPPath (): string|undefined {
        return this.detectedWinSCPPath ?? this.config.store.ssh.winSCPPath
    }

    async getWinSCPURI (connection: SSHConnection): Promise<string> {
        let uri = `scp://${connection.user}`
        const password = await this.passwordStorage.loadPassword(connection)
        if (password) {
            uri += ':' + encodeURIComponent(password)
        }
        uri += `@${connection.host}:${connection.port}/`
        return uri
    }

    async launchWinSCP (session: SSHSession): Promise<void> {
        const path = this.getWinSCPPath()
        if (!path) {
            return
        }
        const args = [await this.getWinSCPURI(session.connection)]
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
