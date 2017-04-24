import * as nodePTY from 'node-pty'
import * as fs from 'fs-promise'
import { Subject } from 'rxjs'
import { Injectable } from '@angular/core'
import { Logger, LogService } from 'terminus-core'
import { exec } from 'mz/child_process'

import { SessionOptions, SessionPersistenceProvider } from '../api'


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
            ...options.env,
            TERM: 'xterm-256color',
        }
        if (options.command.includes(' ')) {
            options.args = ['-c', options.command]
            options.command = 'sh'
        }
        this.pty = nodePTY.spawn(options.command, options.args || [], {
            //name: 'screen-256color',
            name: 'xterm-256color',
            //name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: options.cwd || process.env.HOME,
            env: env,
        })

        this.truePID = options.recoveredTruePID || (<any>this.pty).pid

        this.open = true

        this.pty.on('data', (data) => {
            if (!this.initialDataBufferReleased) {
                this.initialDataBuffer += data
            } else {
                this.output$.next(data)
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
        this.pty.resize(columns, rows)
    }

    write (data) {
        this.pty.write(data)
    }

    kill (signal?: string) {
        this.pty.kill(signal)
    }

    async gracefullyKillProcess (): Promise<void> {
        if (process.platform == 'win32') {
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
        if (process.platform == 'darwin') {
            let lines = (await exec(`lsof -p ${this.truePID} -Fn`))[0].toString().split('\n')
            return lines[2].substring(1)
        }
        if (process.platform == 'linux') {
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

    constructor(
        private persistence: SessionPersistenceProvider,
        log: LogService,
    ) {
        this.logger = log.create('sessions')
    }

    async createNewSession (options: SessionOptions) : Promise<Session> {
        if (this.persistence) {
            let recoveryId = await this.persistence.startSession(options)
            options = await this.persistence.attachSession(recoveryId)
        }
        let session = this.addSession(options)
        return session
    }

    addSession (options: SessionOptions) : Session {
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

    async recover (recoveryId: string) : Promise<Session> {
        if (!this.persistence) {
            return null
        }
        const options = await this.persistence.attachSession(recoveryId)
        if (!options) {
            return null
        }
        return this.addSession(options)
    }
}
