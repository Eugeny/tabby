import * as fs from 'mz/fs'
import * as crypto from 'crypto'
import * as path from 'path'
import * as C from 'constants'
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports, no-duplicate-imports
import { posix as posixPath } from 'path'
import * as sshpk from 'sshpk'
import colors from 'ansi-colors'
import stripAnsi from 'strip-ansi'
import socksv5 from 'socksv5'
import { Injector, NgZone } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, FileProvidersService, HostAppService, Logger, NotificationsService, Platform, PlatformService, wrapPromise, PromptModalComponent, Profile } from 'tabby-core'
import { BaseSession } from 'tabby-terminal'
import { Server, Socket, createServer, createConnection } from 'net'
import { Client, ClientChannel, SFTPWrapper } from 'ssh2'
import type { FileEntry, Stats } from 'ssh2-streams'
import { Subject, Observable } from 'rxjs'
import { ProxyCommandStream } from './services/ssh.service'
import { PasswordStorageService } from './services/passwordStorage.service'
import { promisify } from 'util'

const WINDOWS_OPENSSH_AGENT_PIPE = '\\\\.\\pipe\\openssh-ssh-agent'

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
    HOSTKEY = 'serverHostKey',
}

export interface SSHProfile extends Profile {
    options: SSHProfileOptions
}

export interface SSHProfileOptions {
    host: string
    port?: number
    user: string
    auth?: null|'password'|'publicKey'|'agent'|'keyboardInteractive'
    password?: string
    privateKeys?: string[]
    scripts?: LoginScript[]
    keepaliveInterval?: number
    keepaliveCountMax?: number
    readyTimeout?: number
    x11?: boolean
    skipBanner?: boolean
    jumpHost?: string
    agentForward?: boolean
    warnOnClose?: boolean
    algorithms?: Record<string, string[]>
    proxyCommand?: string
    forwardedPorts?: ForwardedPortConfig[]
}

export enum PortForwardType {
    Local = 'Local',
    Remote = 'Remote',
    Dynamic = 'Dynamic',
}

export interface ForwardedPortConfig {
    type: PortForwardType
    host: string
    port: number
    targetAddress: string
    targetPort: number
}

export class ForwardedPort implements ForwardedPortConfig {
    type: PortForwardType
    host = '127.0.0.1'
    port: number
    targetAddress: string
    targetPort: number

    private listener: Server

    async startLocalListener (callback: (accept: () => Socket, reject: () => void, sourceAddress: string|null, sourcePort: number|null, targetAddress: string, targetPort: number) => void): Promise<void> {
        if (this.type === PortForwardType.Local) {
            this.listener = createServer(s => callback(
                () => s,
                () => s.destroy(),
                s.remoteAddress ?? null,
                s.remotePort ?? null,
                this.targetAddress,
                this.targetPort,
            ))
            return new Promise((resolve, reject) => {
                this.listener.listen(this.port, this.host)
                this.listener.on('error', reject)
                this.listener.on('listening', resolve)
            })
        } else if (this.type === PortForwardType.Dynamic) {
            return new Promise((resolve, reject) => {
                this.listener = socksv5.createServer((info, acceptConnection, rejectConnection) => {
                    callback(
                        () => acceptConnection(true),
                        () => rejectConnection(),
                        null,
                        null,
                        info.dstAddr,
                        info.dstPort,
                    )
                })
                this.listener.on('error', reject)
                this.listener.listen(this.port, this.host, resolve)
                ;(this.listener as any).useAuth(socksv5.auth.None())
            })
        } else {
            throw new Error('Invalid forward type for a local listener')
        }
    }

    stopLocalListener (): void {
        this.listener.close()
    }

    toString (): string {
        if (this.type === PortForwardType.Local) {
            return `(local) ${this.host}:${this.port} → (remote) ${this.targetAddress}:${this.targetPort}`
        } if (this.type === PortForwardType.Remote) {
            return `(remote) ${this.host}:${this.port} → (local) ${this.targetAddress}:${this.targetPort}`
        } else {
            return `(dynamic) ${this.host}:${this.port}`
        }
    }
}

interface AuthMethod {
    type: 'none'|'publickey'|'agent'|'password'|'keyboard-interactive'|'hostbased'
    name?: string
    contents?: Buffer
}

export interface SFTPFile {
    name: string
    fullPath: string
    isDirectory: boolean
    isSymlink: boolean
    mode: number
    size: number
    modified: Date
}

export class SFTPFileHandle {
    position = 0

    constructor (
        private sftp: SFTPWrapper,
        private handle: Buffer,
        private zone: NgZone,
    ) { }

    read (): Promise<Buffer> {
        const buffer = Buffer.alloc(256 * 1024)
        return wrapPromise(this.zone, new Promise((resolve, reject) => {
            while (true) {
                const wait = this.sftp.read(this.handle, buffer, 0, buffer.length, this.position, (err, read) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    this.position += read
                    resolve(buffer.slice(0, read))
                })
                if (!wait) {
                    break
                }
            }
        }))
    }

    write (chunk: Buffer): Promise<void> {
        return wrapPromise(this.zone, new Promise<void>((resolve, reject) => {
            while (true) {
                const wait = this.sftp.write(this.handle, chunk, 0, chunk.length, this.position, err => {
                    if (err) {
                        return reject(err)
                    }
                    this.position += chunk.length
                    resolve()
                })
                if (!wait) {
                    break
                }
            }
        }))
    }

    close (): Promise<void> {
        return wrapPromise(this.zone, promisify(this.sftp.close.bind(this.sftp))(this.handle))
    }
}

export class SFTPSession {
    constructor (private sftp: SFTPWrapper, private zone: NgZone) { }

    async readdir (p: string): Promise<SFTPFile[]> {
        const entries = await wrapPromise(this.zone, promisify<FileEntry[]>(f => this.sftp.readdir(p, f))())
        return entries.map(entry => this._makeFile(
            posixPath.join(p, entry.filename), entry,
        ))
    }

    readlink (p: string): Promise<string> {
        return wrapPromise(this.zone, promisify<string>(f => this.sftp.readlink(p, f))())
    }

    async stat (p: string): Promise<SFTPFile> {
        const stats = await wrapPromise(this.zone, promisify<Stats>(f => this.sftp.stat(p, f))())
        return {
            name: posixPath.basename(p),
            fullPath: p,
            isDirectory: stats.isDirectory(),
            isSymlink: stats.isSymbolicLink(),
            mode: stats.mode,
            size: stats.size,
            modified: new Date(stats.mtime * 1000),
        }
    }

    async open (p: string, mode: string): Promise<SFTPFileHandle> {
        const handle = await wrapPromise(this.zone, promisify<Buffer>(f => this.sftp.open(p, mode, f))())
        return new SFTPFileHandle(this.sftp, handle, this.zone)
    }

    async rmdir (p: string): Promise<void> {
        await promisify((f: any) => this.sftp.rmdir(p, f))()
    }

    async unlink (p: string): Promise<void> {
        await promisify((f: any) => this.sftp.unlink(p, f))()
    }

    private _makeFile (p: string, entry: FileEntry): SFTPFile {
        return {
            fullPath: p,
            name: posixPath.basename(p),
            isDirectory: (entry.attrs.mode & C.S_IFDIR) === C.S_IFDIR,
            isSymlink: (entry.attrs.mode & C.S_IFLNK) === C.S_IFLNK,
            mode: entry.attrs.mode,
            size: entry.attrs.size,
            modified: new Date(entry.attrs.mtime * 1000),
        }
    }
}

export class SSHSession extends BaseSession {
    scripts?: LoginScript[]
    shell?: ClientChannel
    ssh: Client
    sftp?: SFTPWrapper
    forwardedPorts: ForwardedPort[] = []
    logger: Logger
    jumpStream: any
    proxyCommandStream: ProxyCommandStream|null = null
    savedPassword?: string
    get serviceMessage$ (): Observable<string> { return this.serviceMessage }

    agentPath?: string
    activePrivateKey: string|null = null

    private remainingAuthMethods: AuthMethod[] = []
    private serviceMessage = new Subject<string>()
    private keychainPasswordUsed = false

    private passwordStorage: PasswordStorageService
    private ngbModal: NgbModal
    private hostApp: HostAppService
    private platform: PlatformService
    private notifications: NotificationsService
    private zone: NgZone
    private fileProviders: FileProvidersService
    private config: ConfigService

    constructor (
        injector: Injector,
        public profile: SSHProfile,
    ) {
        super()
        this.passwordStorage = injector.get(PasswordStorageService)
        this.ngbModal = injector.get(NgbModal)
        this.hostApp = injector.get(HostAppService)
        this.platform = injector.get(PlatformService)
        this.notifications = injector.get(NotificationsService)
        this.zone = injector.get(NgZone)
        this.fileProviders = injector.get(FileProvidersService)
        this.config = injector.get(ConfigService)

        this.scripts = profile.options.scripts ?? []
        this.destroyed$.subscribe(() => {
            for (const port of this.forwardedPorts) {
                if (port.type === PortForwardType.Local) {
                    port.stopLocalListener()
                }
            }
        })
    }

    async init (): Promise<void> {
        if (this.hostApp.platform === Platform.Windows) {
            if (this.config.store.ssh.agentType === 'auto') {
                if (await fs.exists(WINDOWS_OPENSSH_AGENT_PIPE)) {
                    this.agentPath = WINDOWS_OPENSSH_AGENT_PIPE
                } else {
                    if (await this.platform.isProcessRunning('pageant.exe')) {
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
                this.remainingAuthMethods.push({
                    type: 'publickey',
                    name: 'auto',
                })
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
        return new SFTPSession(this.sftp, this.zone)
    }

    async start (): Promise<void> {
        this.open = true

        this.proxyCommandStream?.on('error', err => {
            this.emitServiceMessage(colors.bgRed.black(' X ') + ` ${err.message}`)
            this.destroy()
        })

        try {
            this.shell = await this.openShellChannel({ x11: this.profile.options.x11 })
        } catch (err) {
            this.emitServiceMessage(colors.bgRed.black(' X ') + ` Remote rejected opening a shell channel: ${err}`)
            if (err.toString().includes('Unable to request X11')) {
                this.emitServiceMessage('    Make sure `xauth` is installed on the remote side')
            }
            return
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
                        this.shell?.write(cmd + '\n')
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

        this.ssh.on('x11', (details, accept, reject) => {
            this.logger.info(`Incoming X11 connection from ${details.srcIP}:${details.srcPort}`)
            const displaySpec = process.env.DISPLAY ?? ':0'
            this.logger.debug(`Trying display ${displaySpec}`)
            const xHost = displaySpec.split(':')[0]
            const xDisplay = parseInt(displaySpec.split(':')[1].split('.')[0] || '0')
            const xPort = xDisplay < 100 ? xDisplay + 6000 : xDisplay

            const socket = displaySpec.startsWith('/') ? createConnection(displaySpec) : new Socket()
            if (!displaySpec.startsWith('/')) {
                socket.connect(xPort, xHost)
            }
            socket.on('error', e => {
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                this.emitServiceMessage(colors.bgRed.black(' X ') + ` Could not connect to the X server: ${e}`)
                this.emitServiceMessage(`    Tabby tried to connect to ${xHost}:${xPort} based on the DISPLAY environment var (${displaySpec})`)
                if (process.platform === 'win32') {
                    this.emitServiceMessage('    To use X forwarding, you need a local X server, e.g.:')
                    this.emitServiceMessage('    * VcXsrv: https://sourceforge.net/projects/vcxsrv/')
                    this.emitServiceMessage('    * Xming: https://sourceforge.net/projects/xming/')
                }
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
        this.logger.info(stripAnsi(msg))
    }

    async handleAuth (methodsLeft?: string[]): Promise<any> {
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
                    this.emitServiceMessage('Using preset password')
                    return {
                        type: 'password',
                        username: this.profile.options.user,
                        password: this.profile.options.password,
                    }
                }

                if (!this.keychainPasswordUsed) {
                    const password = await this.passwordStorage.loadPassword(this.profile)
                    if (password) {
                        this.emitServiceMessage('Trying saved password')
                        this.keychainPasswordUsed = true
                        return {
                            type: 'password',
                            username: this.profile.options.user,
                            password,
                        }
                    }
                }

                const modal = this.ngbModal.open(PromptModalComponent)
                modal.componentInstance.prompt = `Password for ${this.profile.options.user}@${this.profile.options.host}`
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
                            username: this.profile.options.user,
                            password: result.value,
                        }
                    } else {
                        continue
                    }
                } catch {
                    continue
                }
            }
            if (method.type === 'publickey') {
                try {
                    const key = await this.loadPrivateKey(method.contents)
                    return {
                        type: 'publickey',
                        username: this.profile.options.user,
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
                            return reject()
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
                        return reject(err)
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

    resize (columns: number, rows: number): void {
        if (this.shell) {
            this.shell.setWindow(rows, columns, rows, columns)
        }
    }

    write (data: Buffer): void {
        if (this.shell) {
            this.shell.write(data)
        }
    }

    kill (signal?: string): void {
        if (this.shell) {
            this.shell.signal(signal ?? 'TERM')
        }
    }

    async destroy (): Promise<void> {
        this.serviceMessage.complete()
        this.proxyCommandStream?.destroy()
        this.kill()
        this.ssh.end()
        await super.destroy()
    }

    async getChildProcesses (): Promise<any[]> {
        return []
    }

    async gracefullyKillProcess (): Promise<void> {
        this.kill('TERM')
    }

    supportsWorkingDirectory (): boolean {
        return true
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
                    this.shell?.write(script.send + '\n')
                    this.scripts = this.scripts.filter(x => x !== script)
                } else {
                    break
                }
            }
        }
    }

    async loadPrivateKey (privateKeyContents?: Buffer): Promise<string|null> {
        if (!privateKeyContents) {
            const userKeyPath = path.join(process.env.HOME!, '.ssh', 'id_rsa')
            if (await fs.exists(userKeyPath)) {
                this.emitServiceMessage('Using user\'s default private key')
                privateKeyContents = await fs.readFile(userKeyPath, { encoding: null })
            }
        }

        if (!privateKeyContents) {
            return null
        }

        this.emitServiceMessage('Loading private key')
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

                    try {
                        const result = await modal.result
                        passphrase = result?.value
                        if (passphrase && result.remember) {
                            this.passwordStorage.savePrivateKeyPassword(keyHash, passphrase)
                        }
                    } catch {
                        throw e
                    }
                } else {
                    this.notifications.error('Could not read the private key', e.toString())
                    throw e
                }
            }
        }
    }
}

export const ALGORITHM_BLACKLIST = [
    // cause native crashes in node crypto, use EC instead
    'diffie-hellman-group-exchange-sha256',
    'diffie-hellman-group-exchange-sha1',
]
