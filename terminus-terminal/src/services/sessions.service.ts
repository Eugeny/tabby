import psNode = require('ps-node')
let nodePTY
import * as fs from 'mz/fs'
import { Observable, Subject } from 'rxjs'
import { first } from 'rxjs/operators'
import { Injectable, Inject } from '@angular/core'
import { Logger, LogService, ConfigService } from 'terminus-core'
import { exec } from 'mz/child_process'

import { SessionOptions, SessionPersistenceProvider } from '../api'

let macOSNativeProcessList
try {
    macOSNativeProcessList = require('macos-native-processlist')
} catch (e) { } // tslint:disable-line

let windowsProcessTree
try {
    windowsProcessTree = require('windows-process-tree')
} catch (e) {
} // tslint:disable-line

export interface IChildProcess {
    pid: number
    ppid: number
    command: string
}

export abstract class BaseSession {
    open: boolean
    name: string
    recoveryId: string
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

    abstract start (options: SessionOptions)
    abstract resize (columns, rows)
    abstract write (data)
    abstract kill (signal?: string)
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

export class Session extends BaseSession {
    private pty: any
    private pauseAfterExit = false

    start (options: SessionOptions) {
        this.name = options.name
        this.recoveryId = options.recoveryId

        let env = {
            ...process.env,
            TERM: 'xterm-256color',
            ...options.env,
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
        this.pty = nodePTY.spawn(options.command, options.args || [], {
            name: 'xterm-256color',
            cols: options.width || 80,
            rows: options.height || 30,
            cwd: options.cwd || process.env.HOME,
            env: env,
        })

        if (options.recoveredTruePID$) {
            options.recoveredTruePID$.subscribe(pid => {
                this.truePID = pid
            })
        } else {
            this.truePID = (this.pty as any).pid
        }

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
            this.emitOutput(data)
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
            return await new Promise<IChildProcess[]>(resolve => {
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
            return await fs.readlink(`/proc/${this.truePID}/cwd`)
        }
        return null
    }
}

@Injectable()
export class SessionsService {
    sessions: {[id: string]: BaseSession} = {}
    logger: Logger
    private lastID = 0

    constructor (
        @Inject(SessionPersistenceProvider) private persistenceProviders: SessionPersistenceProvider[],
        private config: ConfigService,
        log: LogService,
    ) {
        nodePTY = require('node-pty-tmp')
        nodePTY = require('../bufferizedPTY')(nodePTY)
        this.logger = log.create('sessions')
        this.persistenceProviders = this.config.enabledServices(this.persistenceProviders).filter(x => x.isAvailable())
    }

    async prepareNewSession (options: SessionOptions): Promise<SessionOptions> {
        let persistence = this.getPersistence()
        if (persistence) {
            let recoveryId = await persistence.startSession(options)
            options = await persistence.attachSession(recoveryId)
        }
        return options
    }

    addSession (session: BaseSession, options: SessionOptions) {
        this.lastID++
        options.name = `session-${this.lastID}`
        session.start(options)
        let persistence = this.getPersistence()
        session.destroyed$.pipe(first()).subscribe(() => {
            delete this.sessions[session.name]
            if (persistence) {
                persistence.terminateSession(session.recoveryId)
            }
        })
        this.sessions[session.name] = session
        return session
    }

    async recover (recoveryId: string): Promise<SessionOptions> {
        let persistence = this.getPersistence()
        if (persistence) {
            return await persistence.attachSession(recoveryId)
        }
        return null
    }

    private getPersistence (): SessionPersistenceProvider {
        if (!this.config.store.terminal.persistence) {
            return null
        }
        return this.persistenceProviders.find(x => x.id === this.config.store.terminal.persistence) || null
    }
}
