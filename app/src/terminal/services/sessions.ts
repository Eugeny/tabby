import * as nodePTY from 'node-pty'

import { Injectable, EventEmitter } from '@angular/core'
import { Logger, LogService } from 'services/log'
import { SessionOptions, SessionPersistenceProvider } from '../api'


export class Session {
    open: boolean
    name: string
    dataAvailable = new EventEmitter()
    closed = new EventEmitter()
    destroyed = new EventEmitter()
    recoveryId: string
    private pty: any
    private initialDataBuffer = ''
    private initialDataBufferReleased = false

    constructor (options: SessionOptions) {
        this.name = options.name
        this.recoveryId = options.recoveryId
        console.log('Spawning', options.command)

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

        this.open = true

        this.pty.on('data', (data) => {
            if (!this.initialDataBufferReleased) {
                this.initialDataBuffer += data
            } else {
                this.dataAvailable.emit(data)
            }
        })

        this.pty.on('close', () => {
            this.open = false
            this.closed.emit()
        })
    }

    releaseInitialDataBuffer () {
        this.initialDataBufferReleased = true
        this.dataAvailable.emit(this.initialDataBuffer)
        this.initialDataBuffer = null
    }

    resize (columns, rows) {
        this.pty.resize(columns, rows)
    }

    write (data) {
        this.pty.write(data)
    }

    sendSignal (signal) {
        this.pty.kill(signal)
    }

    close () {
        this.open = false
        this.closed.emit()
        this.pty.end()
    }

    gracefullyDestroy () {
        return new Promise((resolve) => {
            this.sendSignal('SIGTERM')
            if (!this.open) {
                resolve()
                this.destroy()
            } else {
                setTimeout(() => {
                    if (this.open) {
                        this.sendSignal('SIGKILL')
                        this.destroy()
                    }
                    resolve()
                }, 1000)
            }
        })
    }

    destroy () {
        if (open) {
            this.close()
        }
        this.destroyed.emit()
        this.pty.destroy()
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
        options = await this.persistence.createSession(options)
        let session = this.addSession(options)
        return session
    }

    addSession (options: SessionOptions) : Session {
        this.lastID++
        options.name = `session-${this.lastID}`
        let session = new Session(options)
        const destroySubscription = session.destroyed.subscribe(() => {
            delete this.sessions[session.name]
            this.persistence.terminateSession(session.recoveryId)
            destroySubscription.unsubscribe()
        })
        this.sessions[session.name] = session
        return session
    }

    async recover (recoveryId: string) : Promise<Session> {
        const options = await this.persistence.recoverSession(recoveryId)
        if (!options) {
            return null
        }
        return this.addSession(options)
    }
}
