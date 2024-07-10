import * as fs from 'mz/fs'
import * as crypto from 'crypto'
import * as sshpk from 'sshpk'
import colors from 'ansi-colors'
import stripAnsi from 'strip-ansi'
import { Injector } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, FileProvidersService, HostAppService, NotificationsService, Platform, PlatformService, PromptModalComponent, LogService, Logger, TranslateService } from 'tabby-core'
// import { Socket } from 'net'
// import { Client, ClientChannel, SFTPWrapper } from 'ssh2'
import { Subject, Observable } from 'rxjs'
import { HostKeyPromptModalComponent } from '../components/hostKeyPromptModal.component'
// import { HTTPProxyStream, ProxyCommandStream, SocksProxyStream } from '../services/ssh.service'
import { PasswordStorageService } from '../services/passwordStorage.service'
import { SSHKnownHostsService } from '../services/sshKnownHosts.service'
import { SFTPSession } from './sftp'
import { SSHAlgorithmType, SSHProfile, SSHProxyStream, AutoPrivateKeyLocator } from '../api'
import { ForwardedPort } from './forwards'
import { X11Socket } from './x11'
import { supportedAlgorithms } from '../algorithms'
import * as russh from 'russh'

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

// interface Handshake {
//     kex: string
//     serverHostKey: string
// }

export class KeyboardInteractivePrompt {
    readonly responses: string[] = []

    private _resolve: (value: string[]) => void
    private _reject: (reason: any) => void
    readonly promise = new Promise<string[]>((resolve, reject) => {
        this._resolve = resolve
        this._reject = reject
    })

    constructor (
        public name: string,
        public instruction: string,
        public prompts: Prompt[],
    ) {
        this.responses = new Array(this.prompts.length).fill('')
    }

    respond (): void {
        this._resolve(this.responses)
    }

    reject (): void {
        this._reject(new Error('Keyboard-interactive auth rejected'))
    }
}

export class SSHSession {
    shell?: russh.Channel
    ssh: russh.SSHClient|russh.AuthenticatedSSHClient
    // sftp?: SFTPWrapper
    forwardedPorts: ForwardedPort[] = []
    jumpStream: any
    proxyCommandStream: SSHProxyStream|null = null
    savedPassword?: string
    get serviceMessage$ (): Observable<string> { return this.serviceMessage }
    get keyboardInteractivePrompt$ (): Observable<KeyboardInteractivePrompt> { return this.keyboardInteractivePrompt }
    get willDestroy$ (): Observable<void> { return this.willDestroy }

    agentPath?: string
    activePrivateKey: russh.KeyPair|null = null
    authUsername: string|null = null

    open = false

    private logger: Logger
    private refCount = 0
    private remainingAuthMethods: AuthMethod[] = []
    private serviceMessage = new Subject<string>()
    private keyboardInteractivePrompt = new Subject<KeyboardInteractivePrompt>()
    private willDestroy = new Subject<void>()
    private keychainPasswordUsed = false

    private passwordStorage: PasswordStorageService
    private ngbModal: NgbModal
    private hostApp: HostAppService
    private platform: PlatformService
    private notifications: NotificationsService
    // private zone: NgZone
    private fileProviders: FileProvidersService
    private config: ConfigService
    private translate: TranslateService
    private knownHosts: SSHKnownHostsService
    private privateKeyImporters: AutoPrivateKeyLocator[]

    constructor (
        injector: Injector,
        public profile: SSHProfile,
    ) {
        this.logger = injector.get(LogService).create(`ssh-${profile.options.host}-${profile.options.port}`)

        this.passwordStorage = injector.get(PasswordStorageService)
        this.ngbModal = injector.get(NgbModal)
        this.hostApp = injector.get(HostAppService)
        this.platform = injector.get(PlatformService)
        this.notifications = injector.get(NotificationsService)
        // this.zone = injector.get(NgZone)
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
        throw new Error('Not implemented')
        // if (!this.sftp) {
        //     this.sftp = await wrapPromise(this.zone, promisify<SFTPWrapper>(f => this.ssh.sftp(f))())
        // }
        // return new SFTPSession(this.sftp, this.injector)
    }


    async start (): Promise<void> {
        // const log = (s: any) => this.emitServiceMessage(s)

        await this.init()

        const algorithms = {}
        for (const key of Object.values(SSHAlgorithmType)) {
            algorithms[key] = this.profile.options.algorithms![key].filter(x => supportedAlgorithms[key].includes(x))
        }

        // todo migrate connection opts
        this.ssh = await russh.SSHClient.connect(
            `${this.profile.options.host.trim()}:${this.profile.options.port ?? 22}`,
            async key => {
                if (!await this.verifyHostKey(key)) {
                    return false
                }
                this.logger.info('Host key verified')
                return true
            },
            {
                preferred: {
                    ciphers: this.profile.options.algorithms?.[SSHAlgorithmType.CIPHER]?.filter(x => supportedAlgorithms[SSHAlgorithmType.CIPHER].includes(x)),
                    kex: this.profile.options.algorithms?.[SSHAlgorithmType.KEX]?.filter(x => supportedAlgorithms[SSHAlgorithmType.KEX].includes(x)),
                    mac: this.profile.options.algorithms?.[SSHAlgorithmType.HMAC]?.filter(x => supportedAlgorithms[SSHAlgorithmType.HMAC].includes(x)),
                    key: this.profile.options.algorithms?.[SSHAlgorithmType.HOSTKEY]?.filter(x => supportedAlgorithms[SSHAlgorithmType.HOSTKEY].includes(x)),
                },
            },
        )

        this.ssh.disconnect$.subscribe(() => {
            if (this.open) {
                this.destroy()
            }
        })

        // auth

        this.authUsername ??= this.profile.options.user
        if (!this.authUsername) {
            const modal = this.ngbModal.open(PromptModalComponent)
            modal.componentInstance.prompt = `Username for ${this.profile.options.host}`
            try {
                const result = await modal.result.catch(() => null)
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

        const authenticatedClient = await this.handleAuth()
        if (authenticatedClient) {
            this.ssh = authenticatedClient
        } else {
            this.ssh.disconnect()
            this.passwordStorage.deletePassword(this.profile)
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            throw new Error('Authentication rejected')
        }

        // auth success

        if (this.savedPassword) {
            this.passwordStorage.savePassword(this.profile, this.savedPassword)
        }

        //zone ?

        // const resultPromise: Promise<void> = new Promise(async (resolve, reject) => {


        // ssh.on('greeting', greeting => {
        //     if (!this.profile.options.skipBanner) {
        //         log('Greeting: ' + greeting)
        //     }
        // })

        // ssh.on('banner', banner => {
        //     if (!this.profile.options.skipBanner) {
        //         log(banner)
        //     }
        // })
        // })

        try {
            // if (this.profile.options.socksProxyHost) {
            //     this.emitServiceMessage(colors.bgBlue.black(' Proxy ') + ` Using ${this.profile.options.socksProxyHost}:${this.profile.options.socksProxyPort}`)
            //     this.proxyCommandStream = new SocksProxyStream(this.profile)
            // }
            // if (this.profile.options.httpProxyHost) {
            //     this.emitServiceMessage(colors.bgBlue.black(' Proxy ') + ` Using ${this.profile.options.httpProxyHost}:${this.profile.options.httpProxyPort}`)
            //     this.proxyCommandStream = new HTTPProxyStream(this.profile)
            // }
            // if (this.profile.options.proxyCommand) {
            //     this.emitServiceMessage(colors.bgBlue.black(' Proxy command ') + ` Using ${this.profile.options.proxyCommand}`)
            //     this.proxyCommandStream = new ProxyCommandStream(this.profile.options.proxyCommand)
            // }
            // if (this.proxyCommandStream) {
            //     this.proxyCommandStream.destroyed$.subscribe(err => {
            //         if (err) {
            //             this.emitServiceMessage(colors.bgRed.black(' X ') + ` ${err.message}`)
            //             this.destroy()
            //         }
            //     })

            //     this.proxyCommandStream.message$.subscribe(message => {
            //         this.emitServiceMessage(colors.bgBlue.black(' Proxy ') + ' ' + message.trim())
            //     })

            //     await this.proxyCommandStream.start()
            // }


            // ssh.connect({
            //     host: this.profile.options.host.trim(),
            //     port: this.profile.options.port ?? 22,
            //     sock: this.proxyCommandStream?.socket ?? this.jumpStream,
            //     username: this.authUsername ?? undefined,
            //     tryKeyboard: true,
            //     agent: this.agentPath,
            //     agentForward: this.profile.options.agentForward && !!this.agentPath,
            //     keepaliveInterval: this.profile.options.keepaliveInterval ?? 15000,
            //     keepaliveCountMax: this.profile.options.keepaliveCountMax,
            //     readyTimeout: this.profile.options.readyTimeout,
            //     algorithms,
            //     authHandler: (methodsLeft, partialSuccess, callback) => {
            //         this.zone.run(async () => {
            //             callback(await this.handleAuth(methodsLeft))
            //         })
            //     },
            // })
        } catch (e) {
            this.notifications.error(e.message)
            throw e
        }

        // for (const fw of this.profile.options.forwardedPorts ?? []) {
        //     this.addPortForward(Object.assign(new ForwardedPort(), fw))
        // }

        this.open = true

        // this.ssh.on('tcp connection', (details, accept, reject) => {
        //     this.logger.info(`Incoming forwarded connection: (remote) ${details.srcIP}:${details.srcPort} -> (local) ${details.destIP}:${details.destPort}`)
        //     const forward = this.forwardedPorts.find(x => x.port === details.destPort)
        //     if (!forward) {
        //         this.emitServiceMessage(colors.bgRed.black(' X ') + ` Rejected incoming forwarded connection for unrecognized port ${details.destPort}`)
        //         reject()
        //         return
        //     }
        //     const socket = new Socket()
        //     socket.connect(forward.targetPort, forward.targetAddress)
        //     socket.on('error', e => {
        //         // eslint-disable-next-line @typescript-eslint/no-base-to-string
        //         this.emitServiceMessage(colors.bgRed.black(' X ') + ` Could not forward the remote connection to ${forward.targetAddress}:${forward.targetPort}: ${e}`)
        //         reject()
        //     })
        //     socket.on('connect', () => {
        //         this.logger.info('Connection forwarded')
        //         const stream = accept()
        //         stream.pipe(socket)
        //         socket.pipe(stream)
        //         stream.on('close', () => {
        //             socket.destroy()
        //         })
        //         socket.on('close', () => {
        //             stream.close()
        //         })
        //     })
        // })

        this.ssh.x11ChannelOpen$.subscribe(async event => {
            this.logger.info(`Incoming X11 connection from ${event.clientAddress}:${event.clientPort}`)
            const displaySpec = (this.config.store.ssh.x11Display || process.env.DISPLAY) ?? 'localhost:0'
            this.logger.debug(`Trying display ${displaySpec}`)

            const socket = new X11Socket()
            try {
                const x11Stream = await socket.connect(displaySpec)
                this.logger.info('Connection forwarded')

                event.channel.data$.subscribe(data => {
                    x11Stream.write(data)
                })
                x11Stream.on('data', data => {
                    event.channel.write(Uint8Array.from(data))
                })
                event.channel.closed$.subscribe(() => {
                    socket.destroy()
                })
                x11Stream.on('close', () => {
                    event.channel.close()
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
                event.channel.close()
            }
        })
    }

    private async verifyHostKey (key: russh.SshPublicKey): Promise<boolean> {
        this.emitServiceMessage('Host key fingerprint:')
        this.emitServiceMessage(colors.white.bgBlack(` ${key.algorithm()} `) + colors.bgBlackBright(' ' + key.fingerprint() + ' '))
        if (!this.config.store.ssh.verifyHostKeys) {
            return true
        }
        const selector = {
            host: this.profile.options.host,
            port: this.profile.options.port ?? 22,
            type: key.algorithm(),
        }

        const keyDigest = crypto.createHash('sha256').update(key.bytes()).digest('base64')

        const knownHost = this.knownHosts.getFor(selector)
        if (!knownHost || knownHost.digest !== keyDigest) {
            const modal = this.ngbModal.open(HostKeyPromptModalComponent)
            modal.componentInstance.selector = selector
            modal.componentInstance.digest = keyDigest
            return modal.result.catch(() => false)
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

    async handleAuth (methodsLeft?: string[] | null): Promise<russh.AuthenticatedSSHClient|null> {
        this.activePrivateKey = null

        if (!(this.ssh instanceof russh.SSHClient)) {
            throw new Error('Wrong state for auth handling')
        }

        if (!this.authUsername) {
            throw new Error('No username')
        }

        while (true) {
            const method = this.remainingAuthMethods.shift()
            if (!method) {
                return null
            }
            if (methodsLeft && !methodsLeft.includes(method.type) && method.type !== 'agent') {
                // Agent can still be used even if not in methodsLeft
                this.logger.info('Server does not support auth method', method.type)
                continue
            }
            if (method.type === 'password') {
                if (this.profile.options.password) {
                    this.emitServiceMessage(this.translate.instant('Using preset password'))
                    const result = await this.ssh.authenticateWithPassword(this.authUsername, this.profile.options.password)
                    if (result) {
                        return result
                    }
                }

                if (!this.keychainPasswordUsed && this.profile.options.user) {
                    const password = await this.passwordStorage.loadPassword(this.profile)
                    if (password) {
                        this.emitServiceMessage(this.translate.instant('Trying saved password'))
                        this.keychainPasswordUsed = true
                        const result = await this.ssh.authenticateWithPassword(this.authUsername, password)
                        if (result) {
                            return result
                        }
                    }
                }

                const modal = this.ngbModal.open(PromptModalComponent)
                modal.componentInstance.prompt = `Password for ${this.authUsername}@${this.profile.options.host}`
                modal.componentInstance.password = true
                modal.componentInstance.showRememberCheckbox = true

                try {
                    const promptResult = await modal.result.catch(() => null)
                    if (promptResult) {
                        if (promptResult.remember) {
                            this.savedPassword = promptResult.value
                        }
                        const result = await this.ssh.authenticateWithPassword(this.authUsername, promptResult.value)
                        if (result) {
                            return result
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
                    const result = await this.ssh.authenticateWithKeyPair(this.authUsername, key)
                    if (result) {
                        return result
                    }
                } catch (e) {
                    this.emitServiceMessage(colors.bgYellow.yellow.black(' ! ') + ` Failed to load private key ${method.name}: ${e}`)
                    continue
                }
            }
            if (method.type === 'keyboard-interactive') {
                let state: russh.AuthenticatedSSHClient|russh.KeyboardInteractiveAuthenticationState = await this.ssh.startKeyboardInteractiveAuthentication(this.authUsername)

                while (true) {
                    if (state.state === 'failure') {
                        break
                    }

                    const prompts = await state.prompts()

                    let responses: string[] = []
                    // OpenSSH can send a k-i request without prompts
                    // just respond ok to it
                    if (prompts.length > 0) {
                        const prompt = new KeyboardInteractivePrompt(
                            state.name,
                            state.instructions,
                            await state.prompts(),
                        )
                        this.emitKeyboardInteractivePrompt(prompt)

                        try {
                            // eslint-disable-next-line @typescript-eslint/await-thenable
                            responses = await prompt.promise
                        } catch {
                            break // this loop
                        }
                    }

                    state = await this.ssh .continueKeyboardInteractiveAuthentication(responses)

                    if (state instanceof russh.AuthenticatedSSHClient) {
                        return state
                    }
                }
            }
        }
        return null
    }

    async addPortForward (_fw: ForwardedPort): Promise<void> {
        // if (fw.type === PortForwardType.Local || fw.type === PortForwardType.Dynamic) {
        //     await fw.startLocalListener((accept, reject, sourceAddress, sourcePort, targetAddress, targetPort) => {
        //         this.logger.info(`New connection on ${fw}`)
        //         this.ssh.forwardOut(
        //             sourceAddress ?? '127.0.0.1',
        //             sourcePort ?? 0,
        //             targetAddress,
        //             targetPort,
        //             (err, stream) => {
        //                 if (err) {
        //                     // eslint-disable-next-line @typescript-eslint/no-base-to-string
        //                     this.emitServiceMessage(colors.bgRed.black(' X ') + ` Remote has rejected the forwarded connection to ${targetAddress}:${targetPort} via ${fw}: ${err}`)
        //                     reject()
        //                     return
        //                 }
        //                 const socket = accept()
        //                 stream.pipe(socket)
        //                 socket.pipe(stream)
        //                 stream.on('close', () => {
        //                     socket.destroy()
        //                 })
        //                 socket.on('close', () => {
        //                     stream.close()
        //                 })
        //             },
        //         )
        //     }).then(() => {
        //         this.emitServiceMessage(colors.bgGreen.black(' -> ') + ` Forwarded ${fw}`)
        //         this.forwardedPorts.push(fw)
        //     }).catch(e => {
        //         this.emitServiceMessage(colors.bgRed.black(' X ') + ` Failed to forward port ${fw}: ${e}`)
        //         throw e
        //     })
        // }
        // if (fw.type === PortForwardType.Remote) {
        //     await new Promise<void>((resolve, reject) => {
        //         this.ssh.forwardIn(fw.host, fw.port, err => {
        //             if (err) {
        //                 // eslint-disable-next-line @typescript-eslint/no-base-to-string
        //                 this.emitServiceMessage(colors.bgRed.black(' X ') + ` Remote rejected port forwarding for ${fw}: ${err}`)
        //                 reject(err)
        //                 return
        //             }
        //             resolve()
        //         })
        //     })
        //     this.emitServiceMessage(colors.bgGreen.black(' <- ') + ` Forwarded ${fw}`)
        //     this.forwardedPorts.push(fw)
        // }
    }

    async removePortForward (fw: ForwardedPort): Promise<void> {
        // if (fw.type === PortForwardType.Local || fw.type === PortForwardType.Dynamic) {
        //     fw.stopLocalListener()
        //     this.forwardedPorts = this.forwardedPorts.filter(x => x !== fw)
        // }
        // if (fw.type === PortForwardType.Remote) {
        //     this.ssh.unforwardIn(fw.host, fw.port)
        //     this.forwardedPorts = this.forwardedPorts.filter(x => x !== fw)
        // }
        this.emitServiceMessage(`Stopped forwarding ${fw}`)
    }

    async destroy (): Promise<void> {
        this.logger.info('Destroying')
        this.willDestroy.next()
        this.willDestroy.complete()
        this.serviceMessage.complete()
        this.proxyCommandStream?.stop()
        this.ssh.disconnect()
    }

    async openShellChannel (options: { x11: boolean }): Promise<russh.Channel> {
        if (!(this.ssh instanceof russh.AuthenticatedSSHClient)) {
            throw new Error('Cannot open shell channel before auth')
        }
        const ch = await this.ssh.openSessionChannel()
        await ch.requestPTY('xterm-256color', {
            columns: 80,
            rows: 24,
            pixHeight: 0,
            pixWidth: 0,
        })
        if (options.x11) {
            await ch.requestX11Forwarding({
                singleConnection: false,
                authProtocol: 'MIT-MAGIC-COOKIE-1',
                authCookie: crypto.randomBytes(16).toString('hex'),
                screenNumber: 0,
            })
        }
        await ch.requestShell()
        return ch
    }

    async loadPrivateKey (name: string, privateKeyContents: Buffer): Promise<russh.KeyPair> {
        this.emitServiceMessage(`Loading private key: ${name}`)
        //todo passphrase handling
        this.activePrivateKey = await russh.KeyPair.parse(privateKeyContents.toString())
        return this.activePrivateKey
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

                    const result = await modal.result.catch(() => {
                        throw new Error('Passphrase prompt cancelled')
                    })

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
