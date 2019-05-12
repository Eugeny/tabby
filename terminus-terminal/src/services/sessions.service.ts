import psNode = require('ps-node')
let nodePTY
import * as fs from 'mz/fs'
import * as os from 'os'
import { Observable, Subject } from 'rxjs'
import { first } from 'rxjs/operators'
import { Injectable } from '@angular/core'
import { Logger, LogService, ConfigService } from 'terminus-core'
import { exec } from 'mz/child_process'
import { SessionOptions } from '../api'
import { WIN_BUILD_CONPTY_SUPPORTED, isWindowsBuild } from '../utils'

try {
    var macOSNativeProcessList = require('macos-native-processlist') // tslint:disable-line
} catch { } // tslint:disable-line

try {
    var windowsProcessTree = require('@terminus-term/windows-process-tree') // tslint:disable-line
} catch { } // tslint:disable-line

export interface IChildProcess {
    pid: number
    ppid: number
    command: string
}

const windowsDirectoryRegex = /([a-zA-Z]:[^\:\[\]\?\"\<\>\|]+)/mi // tslint:disable-line
const OSC1337Prefix = '\x1b]1337;'
const OSC1337Suffix = '\x07'

/**
 * A session object for a [[BaseTerminalTabComponent]]
 * Extend this to implement custom I/O and process management for your terminal tab
 */
export abstract class BaseSession {
    open: boolean
    name: string
    truePID: number
    protected output = new Subject<string>()
    protected closed = new Subject<void>()
    protected destroyed = new Subject<void>()
    private initialDataBuffer = ''
    private initialDataBufferReleased = false

    get output$ (): Observable<string> { return this.output }
    get closed$ (): Observable<void> { return this.closed }
    get destroyed$ (): Observable<void> { return this.destroyed }

    emitOutput (data: string) {
        if (!this.initialDataBufferReleased) {
            this.initialDataBuffer += data
        } else {
            this.output.next(data)
        }
    }

    releaseInitialDataBuffer () {
        this.initialDataBufferReleased = true
        this.output.next(this.initialDataBuffer)
        this.initialDataBuffer = null
    }

    abstract start (options: SessionOptions): void
    abstract resize (columns: number, rows: number): void
    abstract write (data: string): void
    abstract kill (signal?: string): void
    abstract async getChildProcesses (): Promise<IChildProcess[]>
    abstract async gracefullyKillProcess (): Promise<void>
    abstract async getWorkingDirectory (): Promise<string>

    async destroy (): Promise<void> {
        if (this.open) {
            this.open = false
            this.closed.next()
            this.destroyed.next()
            this.output.complete()
            await this.gracefullyKillProcess()
        }
    }
}

/** @hidden */
export class Session extends BaseSession {
    private pty: any
    private pauseAfterExit = false
    private guessedCWD: string
    private reportedCWD: string

    constructor (private config: ConfigService) {
        super()
    }

    start (options: SessionOptions) {
        this.name = options.name

        let env = {
            ...process.env,
            TERM: 'xterm-256color',
            TERM_PROGRAM: 'Terminus',
            ...options.env,
            ...this.config.store.terminal.environment || {},
        }

        if (process.platform === 'darwin' && !process.env.LC_ALL) {
            let locale = process.env.LC_CTYPE || 'en_US.UTF-8'
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
            cwd = null
        }

        this.pty = nodePTY.spawn(options.command, options.args || [], {
            name: 'xterm-256color',
            cols: options.width || 80,
            rows: options.height || 30,
            cwd,
            env: env,
            // `1` instead of `true` forces ConPTY even if unstable
            experimentalUseConpty: (isWindowsBuild(WIN_BUILD_CONPTY_SUPPORTED) && this.config.store.terminal.useConPTY) ? 1 : false,
        })

        this.guessedCWD = cwd

        this.truePID = (this.pty as any).pid

        setTimeout(async () => {
            // Retrieve any possible single children now that shell has fully started
            let processes = await this.getChildProcesses()
            while (processes.length === 1) {
                this.truePID = processes[0].pid
                processes = await this.getChildProcesses()
            }
        }, 2000)

        this.open = true

        this.pty.on('data-buffered', data => {
            data = this.processOSC1337(data)
            this.emitOutput(data)
            if (process.platform === 'win32') {
                this.guessWindowsCWD(data)
            }
        })

        this.pty.on('exit', () => {
            console.log('session exit')
            if (this.pauseAfterExit) {
                return
            } else if (this.open) {
                this.destroy()
            }
        })

        this.pty.on('close', () => {
            console.log('session close')
            if (this.pauseAfterExit) {
                this.emitOutput('\r\nPress any key to close\r\n')
            } else if (this.open) {
                this.destroy()
            }
        })

        this.pauseAfterExit = options.pauseAfterExit
    }

    processOSC1337 (data) {
        if (data.includes(OSC1337Prefix)) {
            let preData = data.substring(0, data.indexOf(OSC1337Prefix))
            let params = data.substring(data.indexOf(OSC1337Prefix) + OSC1337Prefix.length)
            let postData = params.substring(params.indexOf(OSC1337Suffix) + OSC1337Suffix.length)
            params = params.substring(0, params.indexOf(OSC1337Suffix))

            if (params.startsWith('CurrentDir=')) {
                this.reportedCWD = params.split('=')[1]
                if (this.reportedCWD.startsWith('~')) {
                    this.reportedCWD = os.homedir + this.reportedCWD.substring(1)
                }
                data = preData + postData
            }
        }
        return data
    }

    resize (columns, rows) {
        if (this.pty._writable) {
            this.pty.resize(columns, rows)
        }
    }

    write (data) {
        if (this.open) {
            if (this.pty._writable) {
                this.pty.write(Buffer.from(data, 'utf-8'))
            } else {
                this.destroy()
            }
        }
    }

    kill (signal?: string) {
        this.pty.kill(signal)
    }

    async getChildProcesses (): Promise<IChildProcess[]> {
        if (!this.truePID) {
            return []
        }
        if (process.platform === 'darwin') {
            let processes = await macOSNativeProcessList.getProcessList()
            return processes.filter(x => x.ppid === this.truePID).map(p => ({
                pid: p.pid,
                ppid: p.ppid,
                command: p.name,
            }))
        }
        if (process.platform === 'win32') {
            return new Promise<IChildProcess[]>(resolve => {
                windowsProcessTree.getProcessTree(this.truePID, tree => {
                    resolve(tree ? tree.children.map(child => ({
                        pid: child.pid,
                        ppid: tree.pid,
                        command: child.name,
                    })) : [])
                })
            })
        }
        return new Promise<IChildProcess[]>((resolve, reject) => {
            psNode.lookup({ ppid: this.truePID }, (err, processes) => {
                if (err) {
                    return reject(err)
                }
                resolve(processes as IChildProcess[])
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
                    if (!this.open) {
                        resolve()
                    } else {
                        setTimeout(() => {
                            if (this.open) {
                                this.kill('SIGKILL')
                            }
                            resolve()
                        }, 1000)
                    }
                })
            })
        }
    }

    async getWorkingDirectory (): Promise<string> {
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
            if (lines[1] === 'fcwd') {
                return lines[2].substring(1)
            } else {
                return lines[1].substring(1)
            }
        }
        if (process.platform === 'linux') {
            return fs.readlink(`/proc/${this.truePID}/cwd`)
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
        let match = windowsDirectoryRegex.exec(data)
        if (match) {
            this.guessedCWD = match[0]
        }
    }
}

/** @hidden */
@Injectable({ providedIn: 'root' })
export class SessionsService {
    sessions: {[id: string]: BaseSession} = {}
    logger: Logger
    private lastID = 0

    constructor (
        log: LogService,
    ) {
        nodePTY = require('@terminus-term/node-pty')
        nodePTY = require('../bufferizedPTY')(nodePTY)
        this.logger = log.create('sessions')
    }

    addSession (session: BaseSession, options: SessionOptions) {
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
