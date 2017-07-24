const psNode = require('ps-node')
// import * as nodePTY from 'node-pty'
let nodePTY
import * as fs from 'mz/fs'
import { Subject } from 'rxjs'
import { Injectable } from '@angular/core'
import { Logger, LogService, ElectronService } from 'terminus-core'
import { exec } from 'mz/child_process'

import { SessionOptions, SessionPersistenceProvider } from '../api'

export interface IChildProcess {
    pid: number
    ppid: number
    command: string
}

export class Session {
    open: boolean
    name: string
    output$ = new Subject<string>()
    closed$ = new Subject<void>()
    destroyed$ = new Subject<void>()
    recoveryId: string
    truePID: number
    private pty: any
    private initialDataBuffer = ''
    private initialDataBufferReleased = false

    constructor (options: SessionOptions) {
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

        this.open = true

        this.pty.on('data', (data) => {
            if (!this.initialDataBufferReleased) {
                this.initialDataBuffer += data
            } else {
                this.output$.next(data)
            }
        })

        this.pty.on('exit', () => {
            if (this.open) {
                this.destroy()
            }
        })

        this.pty.on('close', () => {
            if (this.open) {
                this.destroy()
            }
        })
    }

    releaseInitialDataBuffer () {
        this.initialDataBufferReleased = true
        this.output$.next(this.initialDataBuffer)
        this.initialDataBuffer = null
    }

    resize (columns, rows) {
        if (this.pty.writable) {
            this.pty.resize(columns, rows)
        }
    }

    write (data) {
        if (this.pty.writable) {
            this.pty.write(Buffer.from(data, 'utf-8'))
        }
    }

    kill (signal?: string) {
        this.pty.kill(signal)
    }

    async getChildProcesses (): Promise<IChildProcess[]> {
        if (!this.truePID) {
            return []
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

    async destroy (): Promise<void> {
        if (this.open) {
            this.open = false
            this.closed$.next()
            this.destroyed$.next()
            this.output$.complete()
            await this.gracefullyKillProcess()
        }
    }

    async getWorkingDirectory (): Promise<string> {
        if (process.platform === 'darwin') {
            let lines = (await exec(`lsof -p ${this.truePID} -Fn`))[0].toString().split('\n')
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
    sessions: {[id: string]: Session} = {}
    logger: Logger
    private lastID = 0

    constructor (
        private persistence: SessionPersistenceProvider,
        electron: ElectronService,
        log: LogService,
    ) {
        nodePTY = electron.remoteRequirePluginModule('terminus-terminal', 'node-pty', global as any)
        this.logger = log.create('sessions')
    }

    async prepareNewSession (options: SessionOptions): Promise<SessionOptions> {
        if (this.persistence) {
            let recoveryId = await this.persistence.startSession(options)
            options = await this.persistence.attachSession(recoveryId)
        }
        return options
    }

    addSession (options: SessionOptions): Session {
        this.lastID++
        options.name = `session-${this.lastID}`
        let session = new Session(options)
        session.destroyed$.first().subscribe(() => {
            delete this.sessions[session.name]
            if (this.persistence) {
                this.persistence.terminateSession(session.recoveryId)
            }
        })
        this.sessions[session.name] = session
        return session
    }

    async recover (recoveryId: string): Promise<SessionOptions> {
        if (!this.persistence) {
            return null
        }
        return await this.persistence.attachSession(recoveryId)
    }
}
