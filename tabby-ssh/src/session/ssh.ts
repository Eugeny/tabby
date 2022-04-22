import * as fs from 'mz/fs'
import * as crypto from 'crypto'
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports, no-duplicate-imports
import * as sshpk from 'sshpk'
import colors from 'ansi-colors'
import stripAnsi from 'strip-ansi'
import { Injector, NgZone } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, FileProvidersService, HostAppService, NotificationsService, Platform, PlatformService, wrapPromise, PromptModalComponent, LogService, Logger, TranslateService } from 'tabby-core'
import { Socket } from 'net'
import { Client, ClientChannel, SFTPWrapper } from 'ssh2'
import { Subject, Observable } from 'rxjs'
import { HostKeyPromptModalComponent } from '../components/hostKeyPromptModal.component'
import { HTTPProxyStream, ProxyCommandStream, SocksProxyStream } from '../services/ssh.service'
import { PasswordStorageService } from '../services/passwordStorage.service'
import { SSHKnownHostsService } from '../services/sshKnownHosts.service'
import { promisify } from 'util'
import { SFTPSession } from './sftp'
import { SSHAlgorithmType, PortForwardType, SSHProfile, SSHProxyStream, AutoPrivateKeyLocator } from '../api'
import { ForwardedPort } from './forwards'
import { X11Socket } from './x11'
import { supportedAlgorithms } from '../algorithms'

const WINDOWS_OPENSSH_AGENT_PIPE = '\\\\.\\pipe\\openssh-ssh-agent'

export interface Prompt {
    prompt: string
    echo?: boolean
}

interface AuthMethod {
    type: 'none'|'publickey'|'agent'|'password'|'keyboard-interactive'|'hostbased'
    name?: string
    contents?: Buffer
}

interface Handshake {
    kex: string
    serverHostKey: string
}

export class KeyboardInteractivePrompt {
    responses: string[] = []

    constructor (
        public name: string,
        public instruction: string,
        public prompts: Prompt[],
        private callback: (_: string[]) => void,
    ) {
        this.responses = new Array(this.prompts.length).fill('')
    }

    respond (): void {
        this.callback(this.responses)
    }
}

export class SSHSession {
    shell?: ClientChannel
    ssh: Client
    sftp?: SFTPWrapper
    forwardedPorts: ForwardedPort[] = []
    jumpStream: any
    proxyCommandStream: SSHProxyStream|null = null
    savedPassword?: string
    get serviceMessage$ (): Observable<string> { return this.serviceMessage }
    get keyboardInteractivePrompt$ (): Observable<KeyboardInteractivePrompt> { return this.keyboardInteractivePrompt }
    get willDestroy$ (): Observable<void> { return this.willDestroy }

    agentPath?: string
    activePrivateKey: string|null = null
    authUsername: string|null = null

    open = false

    private logger: Logger
    private refCount = 0
    private remainingAuthMethods: AuthMethod[] = []
    private serviceMessage = new Subject<string>()
    private keyboardInteractivePrompt = new Subject<KeyboardInteractivePrompt>()
    private willDestroy = new Subject<void>()
    private keychainPasswordUsed = false
    private hostKeyDigest = ''

    private passwordStorage: PasswordStorageService
    private ngbModal: NgbModal
    private hostApp: HostAppService
    private platform: PlatformService
    private notifications: NotificationsService
    private zone: NgZone
    private fileProviders: FileProvidersService
    private config: ConfigService
    private translate: TranslateService
    private knownHosts: SSHKnownHostsService
    private privateKeyImporters: AutoPrivateKeyLocator[]

    constructor (
        private injector: Injector,
        public profile: SSHProfile,
    ) {
        this.logger = injector.get(LogService).create(`ssh-${profile.options.host}-${profile.options.port}`)

        this.passwordStorage = injector.get(PasswordStorageService)
        this.ngbModal = injector.get(NgbModal)
        this.hostApp = injector.get(HostAppService)
        this.platform = injector.get(PlatformService)
        this.notifications = injector.get(NotificationsService)
        this.zone = injector.get(NgZone)
        this.fileProviders = injector.get(FileProvidersService)
        this.config = injector.get(ConfigService)
        this.translate = injector.get(TranslateService)
        this.knownHosts = injector.get(SSHKnownHostsService)
        this.privateKeyImporters = injector.get(AutoPrivateKeyLocator, [])

        this.willDestroy$.subscribe(() => {
            for (const port of this.forwardedPorts) {
                port.stopLocalListener()
            }
        })
    }

    async init (): Promise<void> {
        if (this.hostApp.platform === Platform.Windows) {
            if (this.config.store.ssh.agentType === 'auto') {
                if (await fs.exists(WINDOWS_OPENSSH_AGENT_PIPE)) {
                    this.agentPath = WINDOWS_OPENSSH_AGENT_PIPE
                } else {
                    if (
                        await this.platform.isProcessRunning('pageant.exe') ||
                        await this.platform.isProcessRunning('gpg-agent.exe')
                    ) {
                        this.agentPath = 'pageant'
                    }
                }
            } else if (this.config.store.ssh.agentType === 'pageant') {
                this.agentPath = 'pageant'
            } else {
                this.agentPath = this.config.store.ssh.agentPath || WINDOWS_OPENSSH_AGENT_PIPE
            }
        } else {
            this.agentPath = process.env.SSH_AUTH_SOCK!
        }

        this.remainingAuthMethods = [{ type: 'none' }]
        if (!this.profile.options.auth || this.profile.options.auth === 'publicKey') {
            if (this.profile.options.privateKeys?.length) {
                for (const pk of this.profile.options.privateKeys) {
                    try {
                        this.remainingAuthMethods.push({
                            type: 'publickey',
                            name: pk,
                            contents: await this.fileProviders.retrieveFile(pk),
                        })
                    } catch (error) {
                        this.emitServiceMessage(colors.bgYellow.yellow.black(' ! ') + ` Could not load private key ${pk}: ${error}`)
                    }
                }
            } else {
                for (const importer of this.privateKeyImporters) {
                    for (const [name, contents] of await importer.getKeys()) {
                        this.remainingAuthMethods.push({
                            type: 'publickey',
                            name,
                            contents,
                        })
                    }
                }
            }
        }
        if (!this.profile.options.auth || this.profile.options.auth === 'agent') {
            if (!this.agentPath) {
                this.emitServiceMessage(colors.bgYellow.yellow.black(' ! ') + ` Agent auth selected, but no running agent is detected`)
            } else {
                this.remainingAuthMethods.push({ type: 'agent' })
            }
        }
        if (!this.profile.options.auth || this.profile.options.auth === 'password') {
            this.remainingAuthMethods.push({ type: 'password' })
        }
        if (!this.profile.options.auth || this.profile.options.auth === 'keyboardInteractive') {
            this.remainingAuthMethods.push({ type: 'keyboard-interactive' })
        }
        this.remainingAuthMethods.push({ type: 'hostbased' })
    }

    async openSFTP (): Promise<SFTPSession> {
        if (!this.sftp) {
            this.sftp = await wrapPromise(this.zone, promisify<SFTPWrapper>(f => this.ssh.sftp(f))())
        }
        return new SFTPSession(this.sftp, this.injector)
    }


    async start (): Promise<void> {
        const log = (s: any) => this.emitServiceMessage(s)

        const ssh = new Client()
        this.ssh = ssh
        await this.init()

        let connected = false
        const algorithms = {}
        for (const key of Object.values(SSHAlgorithmType)) {
            algorithms[key] = this.profile.options.algorithms![key].filter(x => supportedAlgorithms[key].includes(x))
        }

        const hostVerifiedPromise: Promise<void> = new Promise((resolve, reject) => {
            ssh.on('handshake', async handshake => {
                if (!await this.verifyHostKey(handshake)) {
                    this.ssh.end()
                    reject(new Error('Host key verification failed'))
                    return
                }
                this.logger.info('Handshake complete:', handshake)
                resolve()
            })
        })

        const resultPromise: Promise<void> = new Promise(async (resolve, reject) => {
            ssh.on('ready', () => {
                connected = true
                if (this.savedPassword) {
                    this.passwordStorage.savePassword(this.profile, this.savedPassword)
                }

                this.zone.run(resolve)
            })
            ssh.on('error', error => {
                if (error.message === 'All configured authentication methods failed') {
                    this.passwordStorage.deletePassword(this.profile)
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
                if (this.open) {
                    this.destroy()
                }
            })

            ssh.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => this.zone.run(async () => {
                this.emitKeyboardInteractivePrompt(new KeyboardInteractivePrompt(
                    name,
                    instructions,
                    prompts,
                    finish,
                ))
            }))

            ssh.on('greeting', greeting => {
                if (!this.profile.options.skipBanner) {
                    log('Greeting: ' + greeting)
                }
            })

            ssh.on('banner', banner => {
                if (!this.profile.options.skipBanner) {
                    log(banner)
                }
            })
        })

        try {
            if (this.profile.options.socksProxyHost) {
                this.emitServiceMessage(colors.bgBlue.black(' Proxy ') + ` Using ${this.profile.options.socksProxyHost}:${this.profile.options.socksProxyPort}`)
                this.proxyCommandStream = new SocksProxyStream(this.profile)
            }
            if (this.profile.options.httpProxyHost) {
                this.emitServiceMessage(colors.bgBlue.black(' Proxy ') + ` Using ${this.profile.options.httpProxyHost}:${this.profile.options.httpProxyPort}`)
                this.proxyCommandStream = new HTTPProxyStream(this.profile)
            }
            if (this.profile.options.proxyCommand) {
                this.emitServiceMessage(colors.bgBlue.black(' Proxy command ') + ` Using ${this.profile.options.proxyCommand}`)
                this.proxyCommandStream = new ProxyCommandStream(this.profile.options.proxyCommand)
            }
            if (this.proxyCommandStream) {
                this.proxyCommandStream.destroyed$.subscribe(err => {
                    if (err) {
                        this.emitServiceMessage(colors.bgRed.black(' X ') + ` ${err.message}`)
                        this.destroy()
                    }
                })

                this.proxyCommandStream.message$.subscribe(message => {
                    this.emitServiceMessage(colors.bgBlue.black(' Proxy ') + ' ' + message.trim())
                })

                await this.proxyCommandStream.start()
            }

            this.authUsername ??= this.profile.options.user
            if (!this.authUsername) {
                const modal = this.ngbModal.open(PromptModalComponent)
                modal.componentInstance.prompt = `Username for ${this.profile.options.host}`
                try {
                    const result = await modal.result
                    this.authUsername = result?.value ?? null
                } catch {
                    this.authUsername = 'root'
                }
            }
            if (this.authUsername?.startsWith('$')) {
                try {
                    const result = process.env[this.authUsername.slice(1)]
                    this.authUsername = result ?? this.authUsername
                } catch {
                    this.authUsername = 'root'
                }
            }

            ssh.connect({
                host: this.profile.options.host.trim(),
                port: this.profile.options.port ?? 22,
                sock: this.proxyCommandStream?.socket ?? this.jumpStream,
                username: this.authUsername ?? undefined,
                tryKeyboard: true,
                agent: this.agentPath,
                agentForward: this.profile.options.agentForward && !!this.agentPath,
                keepaliveInterval: this.profile.options.keepaliveInterval ?? 15000,
                keepaliveCountMax: this.profile.options.keepaliveCountMax,
                readyTimeout: this.profile.options.readyTimeout,
                hostVerifier: (key: any) => {
                    this.hostKeyDigest = crypto.createHash('sha256').update(key).digest('base64')
                    return true
                },
                algorithms,
                authHandler: (methodsLeft, partialSuccess, callback) => {
                    this.zone.run(async () => {
                        callback(await this.handleAuth(methodsLeft))
                    })
                },
            })
        } catch (e) {
            this.notifications.error(e.message)
            throw e
        }

        await resultPromise
        await hostVerifiedPromise

        for (const fw of this.profile.options.forwardedPorts ?? []) {
            this.addPortForward(Object.assign(new ForwardedPort(), fw))
        }

        this.open = true

        this.ssh.on('tcp connection', (details, accept, reject) => {
            this.logger.info(`Incoming forwarded connection: (remote) ${details.srcIP}:${details.srcPort} -> (local) ${details.destIP}:${details.destPort}`)
            const forward = this.forwardedPorts.find(x => x.port === details.destPort)
            if (!forward) {
                this.emitServiceMessage(colors.bgRed.black(' X ') + ` Rejected incoming forwarded connection for unrecognized port ${details.destPort}`)
                reject()
                return
            }
            const socket = new Socket()
            socket.connect(forward.targetPort, forward.targetAddress)
            socket.on('error', e => {
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
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

        this.ssh.on('x11', async (details, accept, reject) => {
            this.logger.info(`Incoming X11 connection from ${details.srcIP}:${details.srcPort}`)
            const displaySpec = (this.config.store.ssh.x11Display || process.env.DISPLAY) ?? 'localhost:0'
            this.logger.debug(`Trying display ${displaySpec}`)

            const socket = new X11Socket()
            try {
                const x11Stream = await socket.connect(displaySpec)
                this.logger.info('Connection forwarded')
                const stream = accept()
                stream.pipe(x11Stream)
                x11Stream.pipe(stream)
                stream.on('close', () => {
                    socket.destroy()
                })
                x11Stream.on('close', () => {
                    stream.close()
                })
            } catch (e) {
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                this.emitServiceMessage(colors.bgRed.black(' X ') + ` Could not connect to the X server: ${e}`)
                this.emitServiceMessage(`    Tabby tried to connect to ${JSON.stringify(X11Socket.resolveDisplaySpec(displaySpec))} based on the DISPLAY environment var (${displaySpec})`)
                if (process.platform === 'win32') {
                    this.emitServiceMessage('    To use X forwarding, you need a local X server, e.g.:')
                    this.emitServiceMessage('    * VcXsrv: https://sourceforge.net/projects/vcxsrv/')
                    this.emitServiceMessage('    * Xming: https://sourceforge.net/projects/xming/')
                }
                reject()
            }
        })
    }

    private async verifyHostKey (handshake: Handshake): Promise<boolean> {
        this.emitServiceMessage('Host key fingerprint:')
        this.emitServiceMessage(colors.white.bgBlack(` ${handshake.serverHostKey} `) + colors.bgBlackBright(' ' + this.hostKeyDigest + ' '))
        if (!this.config.store.ssh.verifyHostKeys) {
            return true
        }
        const selector = {
            host: this.profile.options.host,
            port: this.profile.options.port ?? 22,
            type: handshake.serverHostKey,
        }
        const knownHost = this.knownHosts.getFor(selector)
        if (!knownHost || knownHost.digest !== this.hostKeyDigest) {
            const modal = this.ngbModal.open(HostKeyPromptModalComponent)
            modal.componentInstance.selector = selector
            modal.componentInstance.digest = this.hostKeyDigest
            try {
                return await modal.result
            } catch {
                return false
            }
        }
        return true
    }

    emitServiceMessage (msg: string): void {
        this.serviceMessage.next(msg)
        this.logger.info(stripAnsi(msg))
    }

    emitKeyboardInteractivePrompt (prompt: KeyboardInteractivePrompt): void {
        this.logger.info('Keyboard-interactive auth:', prompt.name, prompt.instruction)
        this.emitServiceMessage(colors.bgBlackBright(' ') + ` Keyboard-interactive auth requested: ${prompt.name}`)
        if (prompt.instruction) {
            for (const line of prompt.instruction.split('\n')) {
                this.emitServiceMessage(line)
            }
        }
        this.keyboardInteractivePrompt.next(prompt)
    }

    async handleAuth (methodsLeft?: string[] | null): Promise<any> {
        this.activePrivateKey = null

        while (true) {
            const method = this.remainingAuthMethods.shift()
            if (!method) {
                return false
            }
            if (methodsLeft && !methodsLeft.includes(method.type) && method.type !== 'agent') {
                // Agent can still be used even if not in methodsLeft
                this.logger.info('Server does not support auth method', method.type)
                continue
            }
            if (method.type === 'password') {
                if (this.profile.options.password) {
                    this.emitServiceMessage(this.translate.instant('Using preset password'))
                    return {
                        type: 'password',
                        username: this.authUsername,
                        password: this.profile.options.password,
                    }
                }

                if (!this.keychainPasswordUsed && this.profile.options.user) {
                    const password = await this.passwordStorage.loadPassword(this.profile)
                    if (password) {
                        this.emitServiceMessage(this.translate.instant('Trying saved password'))
                        this.keychainPasswordUsed = true
                        return {
                            type: 'password',
                            username: this.authUsername,
                            password,
                        }
                    }
                }

                const modal = this.ngbModal.open(PromptModalComponent)
                modal.componentInstance.prompt = `Password for ${this.authUsername}@${this.profile.options.host}`
                modal.componentInstance.password = true
                modal.componentInstance.showRememberCheckbox = true

                try {
                    const result = await modal.result
                    if (result) {
                        if (result.remember) {
                            this.savedPassword = result.value
                        }
                        return {
                            type: 'password',
                            username: this.authUsername,
                            password: result.value,
                        }
                    } else {
                        continue
                    }
                } catch {
                    continue
                }
            }
            if (method.type === 'publickey' && method.contents) {
                try {
                    const key = await this.loadPrivateKey(method.name!, method.contents)
                    return {
                        type: 'publickey',
                        username: this.authUsername,
                        key,
                    }
                } catch (e) {
                    this.emitServiceMessage(colors.bgYellow.yellow.black(' ! ') + ` Failed to load private key ${method.name}: ${e}`)
                    continue
                }
            }
            return method.type
        }
    }

    async addPortForward (fw: ForwardedPort): Promise<void> {
        if (fw.type === PortForwardType.Local || fw.type === PortForwardType.Dynamic) {
            await fw.startLocalListener((accept, reject, sourceAddress, sourcePort, targetAddress, targetPort) => {
                this.logger.info(`New connection on ${fw}`)
                this.ssh.forwardOut(
                    sourceAddress ?? '127.0.0.1',
                    sourcePort ?? 0,
                    targetAddress,
                    targetPort,
                    (err, stream) => {
                        if (err) {
                            // eslint-disable-next-line @typescript-eslint/no-base-to-string
                            this.emitServiceMessage(colors.bgRed.black(' X ') + ` Remote has rejected the forwarded connection to ${targetAddress}:${targetPort} via ${fw}: ${err}`)
                            reject()
                            return
                        }
                        const socket = accept()
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
                this.emitServiceMessage(colors.bgGreen.black(' -> ') + ` Forwarded ${fw}`)
                this.forwardedPorts.push(fw)
            }).catch(e => {
                this.emitServiceMessage(colors.bgRed.black(' X ') + ` Failed to forward port ${fw}: ${e}`)
                throw e
            })
        }
        if (fw.type === PortForwardType.Remote) {
            await new Promise<void>((resolve, reject) => {
                this.ssh.forwardIn(fw.host, fw.port, err => {
                    if (err) {
                        // eslint-disable-next-line @typescript-eslint/no-base-to-string
                        this.emitServiceMessage(colors.bgRed.black(' X ') + ` Remote rejected port forwarding for ${fw}: ${err}`)
                        reject(err)
                        return
                    }
                    resolve()
                })
            })
            this.emitServiceMessage(colors.bgGreen.black(' <- ') + ` Forwarded ${fw}`)
            this.forwardedPorts.push(fw)
        }
    }

    async removePortForward (fw: ForwardedPort): Promise<void> {
        if (fw.type === PortForwardType.Local || fw.type === PortForwardType.Dynamic) {
            fw.stopLocalListener()
            this.forwardedPorts = this.forwardedPorts.filter(x => x !== fw)
        }
        if (fw.type === PortForwardType.Remote) {
            this.ssh.unforwardIn(fw.host, fw.port)
            this.forwardedPorts = this.forwardedPorts.filter(x => x !== fw)
        }
        this.emitServiceMessage(`Stopped forwarding ${fw}`)
    }

    async destroy (): Promise<void> {
        this.logger.info('Destroying')
        this.willDestroy.next()
        this.willDestroy.complete()
        this.serviceMessage.complete()
        this.proxyCommandStream?.stop()
        this.ssh.end()
    }

    openShellChannel (options: { x11: boolean }): Promise<ClientChannel> {
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

    async loadPrivateKey (name: string, privateKeyContents: Buffer): Promise<string|null> {
        this.emitServiceMessage(`Loading private key: ${name}`)
        try {
            const parsedKey = await this.parsePrivateKey(privateKeyContents.toString())
            this.activePrivateKey = parsedKey.toString('openssh')
            return this.activePrivateKey
        } catch (error) {
            this.emitServiceMessage(colors.bgRed.black(' X ') + ' Could not read the private key file')
            this.emitServiceMessage(colors.bgRed.black(' X ') + ` ${error}`)
            this.notifications.error('Could not read the private key file')
            return null
        }
    }

    async parsePrivateKey (privateKey: string): Promise<any> {
        const keyHash = crypto.createHash('sha512').update(privateKey).digest('hex')
        let triedSavedPassphrase = false
        let passphrase: string|null = null
        while (true) {
            try {
                return sshpk.parsePrivateKey(privateKey, 'auto', { passphrase })
            } catch (e) {
                if (!triedSavedPassphrase) {
                    passphrase = await this.passwordStorage.loadPrivateKeyPassword(keyHash)
                    triedSavedPassphrase = true
                    continue
                }
                if (e instanceof sshpk.KeyEncryptedError || e instanceof sshpk.KeyParseError) {
                    await this.passwordStorage.deletePrivateKeyPassword(keyHash)

                    const modal = this.ngbModal.open(PromptModalComponent)
                    modal.componentInstance.prompt = 'Private key passphrase'
                    modal.componentInstance.password = true
                    modal.componentInstance.showRememberCheckbox = true

                    const result = await modal.result
                    passphrase = result?.value
                    if (passphrase && result.remember) {
                        this.passwordStorage.savePrivateKeyPassword(keyHash, passphrase)
                    }
                } else {
                    this.notifications.error('Could not read the private key', e.toString())
                    throw e
                }
            }
        }
    }

    ref (): void {
        this.refCount++
    }

    unref (): void {
        this.refCount--
        if (this.refCount === 0) {
            this.destroy()
        }
    }
}
