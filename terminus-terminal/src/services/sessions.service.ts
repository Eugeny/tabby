import * as psNode from 'ps-node'
import * as fs from 'mz/fs'
import * as os from 'os'
import * as nodePTY from '@terminus-term/node-pty'

import { Observable, Subject } from 'rxjs'
import { first } from 'rxjs/operators'
import { Injectable } from '@angular/core'
import { Logger, LogService, ConfigService, WIN_BUILD_CONPTY_SUPPORTED, isWindowsBuild } from 'terminus-core'
import { exec } from 'mz/child_process'
import { SessionOptions } from '../api/interfaces'

/* eslint-disable block-scoped-var */

try {
    var macOSNativeProcessList = require('macos-native-processlist')  // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

try {
    var windowsProcessTree = require('windows-process-tree')  // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }


export interface ChildProcess {
    pid: number
    ppid: number
    command: string
}

const windowsDirectoryRegex = /([a-zA-Z]:[^\:\[\]\?\"\<\>\|]+)/mi
const catalinaDataVolumePrefix = '/System/Volumes/Data'
const OSC1337Prefix = Buffer.from('\x1b]1337;')
const OSC1337Suffix = Buffer.from('\x07')

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
    abstract async getWorkingDirectory (): Promise<string|null>
}

/** @hidden */
export class Session extends BaseSession {
    private pty: any
    private pauseAfterExit = false
    private guessedCWD: string|null = null
    private reportedCWD: string

    constructor (private config: ConfigService) {
        super()
    }

    start (options: SessionOptions): void {
        this.name = options.name || ''

        const env = {
            ...process.env,
            TERM: 'xterm-256color',
            TERM_PROGRAM: 'Terminus',
            ...options.env,
            ...this.config.store.terminal.environment || {},
        }

        if (process.platform === 'darwin' && !process.env.LC_ALL) {
            const locale = process.env.LC_CTYPE || 'en_US.UTF-8'
            Object.assign(env, {
                LANG: locale,
                LC_ALL: locale,
                LC_MESSAGES: locale,
                LC_NUMERIC: locale,
                LC_COLLATE: locale,
                LC_MONETARY: locale,
            })
        }

        let cwd = options.cwd || process.env.HOME

        if (!fs.existsSync(cwd)) {
            console.warn('Ignoring non-existent CWD:', cwd)
            cwd = undefined
        }

        this.pty = nodePTY.spawn(options.command, options.args || [], {
            name: 'xterm-256color',
            cols: options.width || 80,
            rows: options.height || 30,
            encoding: null,
            cwd,
            env: env,
            // `1` instead of `true` forces ConPTY even if unstable
            useConpty: (isWindowsBuild(WIN_BUILD_CONPTY_SUPPORTED) && this.config.store.terminal.useConPTY ? 1 : false) as any,
        })

        this.guessedCWD = cwd || null

        this.truePID = this.pty['pid']

        setTimeout(async () => {
            // Retrieve any possible single children now that shell has fully started
            let processes = await this.getChildProcesses()
            while (processes.length === 1) {
                this.truePID = processes[0].pid
                processes = await this.getChildProcesses()
            }
        }, 2000)

        this.open = true

        this.pty.on('data-buffered', (data: Buffer) => {
            data = this.processOSC1337(data)
            this.emitOutput(data)
            if (process.platform === 'win32') {
                this.guessWindowsCWD(data.toString())
            }
        })

        this.pty.on('exit', () => {
            if (this.pauseAfterExit) {
                return
            } else if (this.open) {
                this.destroy()
            }
        })

        this.pty.on('close', () => {
            if (this.pauseAfterExit) {
                this.emitOutput(Buffer.from('\r\nPress any key to close\r\n'))
            } else if (this.open) {
                this.destroy()
            }
        })

        this.pauseAfterExit = options.pauseAfterExit || false
    }

    resize (columns: number, rows: number): void {
        if (this.pty._writable) {
            this.pty.resize(columns, rows)
        }
    }

    write (data: Buffer): void {
        if (this.open) {
            if (this.pty._writable) {
                this.pty.write(data)
            } else {
                this.destroy()
            }
        }
    }

    kill (signal?: string): void {
        this.pty.kill(signal)
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
                        process.kill(this.pty.pid, 0)
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

    async getWorkingDirectory (): Promise<string|null> {
        if (this.reportedCWD) {
            return this.reportedCWD
        }
        if (!this.truePID) {
            return null
        }
        if (process.platform === 'darwin') {
            let lines: string[]
            try {
                lines = (await exec(`lsof -p ${this.truePID} -Fn`))[0].toString().split('\n')
            } catch (e) {
                return null
            }
            let cwd = lines[lines[1] === 'fcwd' ? 2 : 1].substring(1)
            if (cwd.startsWith(catalinaDataVolumePrefix)) {
                cwd = cwd.substring(catalinaDataVolumePrefix.length)
            }
            return cwd
        }
        if (process.platform === 'linux') {
            try {
                const cwd = await fs.readlink(`/proc/${this.truePID}/cwd`)
                return cwd
            } catch (exc) {
                console.error(exc)
                return null
            }
        }
        if (process.platform === 'win32') {
            if (!this.guessedCWD) {
                return null
            }
            try {
                await fs.access(this.guessedCWD)
            } catch (e) {
                return null
            }
            return this.guessedCWD
        }
        return null
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
            let params = data.subarray(data.indexOf(OSC1337Prefix) + OSC1337Prefix.length)
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
    sessions: {[id: string]: BaseSession} = {}
    logger: Logger
    private lastID = 0

    private constructor (
        log: LogService,
    ) {
        require('../bufferizedPTY')(nodePTY) // eslint-disable-line @typescript-eslint/no-var-requires
        this.logger = log.create('sessions')
    }

    addSession (session: BaseSession, options: SessionOptions): BaseSession {
        this.lastID++
        options.name = `session-${this.lastID}`
        session.start(options)
        session.destroyed$.pipe(first()).subscribe(() => {
            delete this.sessions[session.name]
        })
        this.sessions[session.name] = session
        return session
    }
}
