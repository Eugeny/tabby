import * as psNode from 'ps-node'
import * as fs from 'mz/fs'
import * as os from 'os'
import { ipcRenderer } from 'electron'
import { getWorkingDirectoryFromPID } from 'native-process-working-directory'
import { Observable, Subject } from 'rxjs'
import { first } from 'rxjs/operators'
import { Injectable } from '@angular/core'
import { Logger, LogService, ConfigService, WIN_BUILD_CONPTY_SUPPORTED, isWindowsBuild } from 'terminus-core'
import { SessionOptions, ChildProcess } from '../api/interfaces'

/* eslint-disable block-scoped-var */

try {
    var macOSNativeProcessList = require('macos-native-processlist')  // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

try {
    var windowsProcessTree = require('windows-process-tree')  // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

const windowsDirectoryRegex = /([a-zA-Z]:[^\:\[\]\?\"\<\>\|]+)/mi
const OSC1337Prefix = Buffer.from('\x1b]1337;')
const OSC1337Suffix = Buffer.from('\x07')

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PTYProxy {
    private id: string
    private subscriptions: Map<string, any> = new Map()

    static spawn (...options: any[]): PTYProxy {
        return new PTYProxy(null, ...options)
    }

    static restore (id: string): PTYProxy|null {
        if (ipcRenderer.sendSync('pty:exists', id)) {
            return new PTYProxy(id)
        }
        return null
    }

    private constructor (id: string|null, ...options: any[]) {
        if (id) {
            this.id = id
        } else {
            this.id = ipcRenderer.sendSync('pty:spawn', ...options)
        }
    }

    getPTYID (): string {
        return this.id
    }

    getPID (): number {
        return ipcRenderer.sendSync('pty:get-pid', this.id)
    }

    subscribe (event: string, handler: (..._: any[]) => void): void {
        const key = `pty:${this.id}:${event}`
        const newHandler = (_event, ...args) => handler(...args)
        this.subscriptions.set(key, newHandler)
        ipcRenderer.on(key, newHandler)
    }

    ackData (length: number): void {
        ipcRenderer.send('pty:ack-data', this.id, length)
    }

    unsubscribeAll (): void {
        for (const k of this.subscriptions.keys()) {
            ipcRenderer.off(k, this.subscriptions.get(k))
        }
    }

    resize (columns: number, rows: number): void {
        ipcRenderer.send('pty:resize', this.id, columns, rows)
    }

    write (data: Buffer): void {
        ipcRenderer.send('pty:write', this.id, data)
    }

    kill (signal?: string): void {
        ipcRenderer.send('pty:kill', this.id, signal)
    }
}

/**
 * A session object for a [[BaseTerminalTabComponent]]
 * Extend this to implement custom I/O and process management for your terminal tab
 */
export abstract class BaseSession {
    open: boolean
    name: string
    truePID: number
    protected output = new Subject<string>()
    protected binaryOutput = new Subject<Buffer>()
    protected closed = new Subject<void>()
    protected destroyed = new Subject<void>()
    private initialDataBuffer = Buffer.from('')
    private initialDataBufferReleased = false

    get output$ (): Observable<string> { return this.output }
    get binaryOutput$ (): Observable<Buffer> { return this.binaryOutput }
    get closed$ (): Observable<void> { return this.closed }
    get destroyed$ (): Observable<void> { return this.destroyed }

    emitOutput (data: Buffer): void {
        if (!this.initialDataBufferReleased) {
            this.initialDataBuffer = Buffer.concat([this.initialDataBuffer, data])
        } else {
            this.output.next(data.toString())
            this.binaryOutput.next(data)
        }
    }

    releaseInitialDataBuffer (): void {
        this.initialDataBufferReleased = true
        this.output.next(this.initialDataBuffer.toString())
        this.binaryOutput.next(this.initialDataBuffer)
        this.initialDataBuffer = Buffer.from('')
    }

    async destroy (): Promise<void> {
        if (this.open) {
            this.open = false
            this.closed.next()
            this.destroyed.next()
            this.closed.complete()
            this.destroyed.complete()
            this.output.complete()
            this.binaryOutput.complete()
            await this.gracefullyKillProcess()
        }
    }

    abstract start (options: SessionOptions): void
    abstract resize (columns: number, rows: number): void
    abstract write (data: Buffer): void
    abstract kill (signal?: string): void
    abstract async getChildProcesses (): Promise<ChildProcess[]>
    abstract async gracefullyKillProcess (): Promise<void>
    abstract supportsWorkingDirectory (): boolean
    abstract async getWorkingDirectory (): Promise<string|null>
}

/** @hidden */
export class Session extends BaseSession {
    private pty: PTYProxy|null = null
    private pauseAfterExit = false
    private guessedCWD: string|null = null
    private reportedCWD: string
    private initialCWD: string|null = null

    constructor (private config: ConfigService) {
        super()
    }

    start (options: SessionOptions): void {
        this.name = options.name ?? ''

        let pty: PTYProxy|null = null

        if (options.restoreFromPTYID) {
            pty = PTYProxy.restore(options.restoreFromPTYID)
            options.restoreFromPTYID = undefined
        }

        if (!pty) {
            // filter out empty env
            const { '': _, ...env } = {
                ...process.env,
                TERM: 'xterm-256color',
                TERM_PROGRAM: 'Terminus',
                ...options.env,
                ...this.config.store.terminal.environment || {},
            }

            if (process.platform === 'darwin' && !process.env.LC_ALL) {
                const locale = process.env.LC_CTYPE ?? 'en_US.UTF-8'
                Object.assign(env, {
                    LANG: locale,
                    LC_ALL: locale,
                    LC_MESSAGES: locale,
                    LC_NUMERIC: locale,
                    LC_COLLATE: locale,
                    LC_MONETARY: locale,
                })
            }

            let cwd = options.cwd ?? process.env.HOME

            if (!fs.existsSync(cwd)) {
                console.warn('Ignoring non-existent CWD:', cwd)
                cwd = undefined
            }

            pty = PTYProxy.spawn(options.command, options.args ?? [], {
                name: 'xterm-256color',
                cols: options.width ?? 80,
                rows: options.height ?? 30,
                encoding: null,
                cwd,
                env: env,
                // `1` instead of `true` forces ConPTY even if unstable
                useConpty: (isWindowsBuild(WIN_BUILD_CONPTY_SUPPORTED) && this.config.store.terminal.useConPTY ? 1 : false) as any,
            })

            this.guessedCWD = cwd ?? null
        }

        this.pty = pty

        this.truePID = this.pty.getPID()

        setTimeout(async () => {
            // Retrieve any possible single children now that shell has fully started
            let processes = await this.getChildProcesses()
            while (processes.length === 1) {
                this.truePID = processes[0].pid
                processes = await this.getChildProcesses()
            }
            this.initialCWD = await this.getWorkingDirectory()
        }, 2000)

        this.open = true

        this.pty.subscribe('data-buffered', (array: Uint8Array) => {
            this.pty!.ackData(array.length)

            let data = Buffer.from(array)
            data = this.processOSC1337(data)
            this.emitOutput(data)
            if (process.platform === 'win32') {
                this.guessWindowsCWD(data.toString())
            }
        })

        this.pty.subscribe('exit', () => {
            if (this.pauseAfterExit) {
                return
            } else if (this.open) {
                this.destroy()
            }
        })

        this.pty.subscribe('close', () => {
            if (this.pauseAfterExit) {
                this.emitOutput(Buffer.from('\r\nPress any key to close\r\n'))
            } else if (this.open) {
                this.destroy()
            }
        })

        this.pauseAfterExit = options.pauseAfterExit ?? false

        this.destroyed$.subscribe(() => this.pty!.unsubscribeAll())
    }

    getPTYID (): string|null {
        return this.pty?.getPTYID() ?? null
    }

    resize (columns: number, rows: number): void {
        this.pty?.resize(columns, rows)
    }

    write (data: Buffer): void {
        if (this.open) {
            this.pty?.write(data)
            // TODO if (this.pty._writable) {
            // } else {
            //     this.destroy()
            // }
        }
    }

    kill (signal?: string): void {
        this.pty?.kill(signal)
    }

    async getChildProcesses (): Promise<ChildProcess[]> {
        if (!this.truePID) {
            return []
        }
        if (process.platform === 'darwin') {
            const processes = await macOSNativeProcessList.getProcessList()
            return processes.filter(x => x.ppid === this.truePID).map(p => ({
                pid: p.pid,
                ppid: p.ppid,
                command: p.name,
            }))
        }
        if (process.platform === 'win32') {
            return new Promise<ChildProcess[]>(resolve => {
                windowsProcessTree.getProcessTree(this.truePID, tree => {
                    resolve(tree ? tree.children.map(child => ({
                        pid: child.pid,
                        ppid: tree.pid,
                        command: child.name,
                    })) : [])
                })
            })
        }
        return new Promise<ChildProcess[]>((resolve, reject) => {
            psNode.lookup({ ppid: this.truePID }, (err, processes) => {
                if (err) {
                    return reject(err)
                }
                resolve(processes as ChildProcess[])
            })
        })
    }

    async gracefullyKillProcess (): Promise<void> {
        if (process.platform === 'win32') {
            this.kill()
        } else {
            await new Promise((resolve) => {
                this.kill('SIGTERM')
                setImmediate(() => {
                    try {
                        process.kill(this.pty!.getPID(), 0)
                        // still alive
                        setTimeout(() => {
                            this.kill('SIGKILL')
                            resolve()
                        }, 1000)
                    } catch {
                        resolve()
                    }
                })
            })
        }
    }

    supportsWorkingDirectory (): boolean {
        return !!(this.truePID || this.reportedCWD || this.guessedCWD)
    }

    async getWorkingDirectory (): Promise<string|null> {
        if (this.reportedCWD) {
            return this.reportedCWD
        }
        if (!this.truePID) {
            return null
        }
        let cwd: string|null = null
        try {
            cwd = getWorkingDirectoryFromPID(this.truePID)
        } catch (exc) {
            console.error(exc)
        }

        try {
            cwd = await fs.realpath(cwd)
        } catch {}

        if (process.platform === 'win32' && (cwd === this.initialCWD || cwd === process.env.WINDIR)) {
            // shell doesn't truly change its process' CWD
            cwd = null
        }

        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        cwd = cwd || this.guessedCWD

        try {
            await fs.access(cwd)
        } catch {
            return null
        }
        return cwd
    }

    private guessWindowsCWD (data: string) {
        const match = windowsDirectoryRegex.exec(data)
        if (match) {
            this.guessedCWD = match[0]
        }
    }

    private processOSC1337 (data: Buffer) {
        if (data.includes(OSC1337Prefix)) {
            const preData = data.subarray(0, data.indexOf(OSC1337Prefix))
            const params = data.subarray(data.indexOf(OSC1337Prefix) + OSC1337Prefix.length)
            const postData = params.subarray(params.indexOf(OSC1337Suffix) + OSC1337Suffix.length)
            const paramString = params.subarray(0, params.indexOf(OSC1337Suffix)).toString()

            if (paramString.startsWith('CurrentDir=')) {
                this.reportedCWD = paramString.split('=')[1]
                if (this.reportedCWD.startsWith('~')) {
                    this.reportedCWD = os.homedir() + this.reportedCWD.substring(1)
                }
                data = Buffer.concat([preData, postData])
            }
        }
        return data
    }
}

/** @hidden */
@Injectable({ providedIn: 'root' })
export class SessionsService {
    sessions = new Map<string, BaseSession>()
    logger: Logger
    private lastID = 0

    private constructor (
        log: LogService,
    ) {
        this.logger = log.create('sessions')
    }

    addSession (session: BaseSession, options: SessionOptions): BaseSession {
        this.lastID++
        options.name = `session-${this.lastID}`
        session.start(options)
        session.destroyed$.pipe(first()).subscribe(() => {
            this.sessions.delete(session.name)
        })
        this.sessions.set(session.name, session)
        return session
    }
}
