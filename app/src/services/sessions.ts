import { Injectable, NgZone, EventEmitter } from '@angular/core'
import { Logger, LogService } from 'services/log'
import * as ptyjs from 'pty.js'


export interface SessionOptions {
    name?: string,
    command: string,
    cwd?: string,
    env?: string,
}

export class Session {
    open: boolean
    name: string
    pty: any
    dataAvailable = new EventEmitter()
    closed = new EventEmitter()
    destroyed = new EventEmitter()

    constructor (options: SessionOptions) {
        this.name = options.name
        this.pty = ptyjs.spawn('sh', ['-c', options.command], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: options.cwd || process.env.HOME,
            env: options.env || process.env,
        })

        this.open = true

        this.pty.on('data', (data) => {
            this.dataAvailable.emit(data)
        })

        this.pty.on('close', () => {
            this.open = false
            this.closed.emit()
        })
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
            if (!open) {
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
        log: LogService,
    ) {
        this.logger = log.create('sessions')
    }

    createSession (options: SessionOptions) : Session {
        this.lastID++
        options.name = `session-${this.lastID}`
        let session = new Session(options)
        const destroySubscription = session.destroyed.subscribe(() => {
            delete this.sessions[session.name]
            destroySubscription.unsubscribe()
        })
        this.sessions[session.name] = session
        return session
    }
}
