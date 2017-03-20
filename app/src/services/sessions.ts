import { Injectable, NgZone, EventEmitter } from '@angular/core'
import { Logger, LogService } from 'services/log'
const exec = require('child-process-promise').exec
import * as crypto from 'crypto'
import * as nodePTY from 'node-pty'
import * as fs from 'fs'


export interface SessionRecoveryProvider {
    list(): Promise<any[]>
    getRecoveryCommand(item: any): string
    getNewSessionCommand(command: string): string
}

export class NullSessionRecoveryProvider implements SessionRecoveryProvider {
    list(): Promise<any[]> {
        return Promise.resolve([])
    }

    getRecoveryCommand(_: any): string {
        return null
    }

    getNewSessionCommand(command: string) {
        return command
    }
}

export class ScreenSessionRecoveryProvider implements SessionRecoveryProvider {
    list(): Promise<any[]> {
        return exec('screen -ls').then((result) => {
            return result.stdout.split('\n')
                .filter((line) => /\bterm-tab-/.exec(line))
                .map((line) => line.trim().split('.')[0])
        }).catch(() => {
            return []
        })
    }

    getRecoveryCommand(item: any): string {
        return `screen -r ${item}`
    }

    getNewSessionCommand(command: string): string {
        const id = crypto.randomBytes(8).toString('hex')
        // TODO
        let configPath = '/tmp/.termScreenConfig'
        fs.writeFileSync(configPath, `
            escape ^^^
            vbell off
            term xterm-color
            bindkey "^[OH" beginning-of-line
            bindkey "^[OF" end-of-line
        `, 'utf-8')
        return `screen -c ${configPath} -U -S term-tab-${id} -- ${command}`
    }
}


export interface SessionOptions {
    name?: string,
    command?: string,
    shell?: string,
    cwd?: string,
    env?: any,
}

export class Session {
    open: boolean
    name: string
    dataAvailable = new EventEmitter()
    closed = new EventEmitter()
    destroyed = new EventEmitter()
    private pty: any
    private initialDataBuffer = ''
    private initialDataBufferReleased = false

    constructor (options: SessionOptions) {
        this.name = options.name
        console.log('Spawning', options.command)

        let binary = options.shell || 'sh'
        let args = options.shell ? [] : ['-c', options.command]
        let env = {
            ...process.env,
            ...options.env,
            TERM: 'xterm-256color',
        }
        this.pty = nodePTY.spawn(binary, args, {
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
    recoveryProvider: SessionRecoveryProvider

    constructor(
        private zone: NgZone,
        log: LogService,
    ) {
        this.logger = log.create('sessions')
        this.recoveryProvider = new ScreenSessionRecoveryProvider()
        //this.recoveryProvider = new NullSessionRecoveryProvider()
    }

    createNewSession (options: SessionOptions) : Session {
        options.command = this.recoveryProvider.getNewSessionCommand(options.command)
        return this.createSession(options)
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

    recoverAll () : Promise<Session[]> {
        return <Promise<Session[]>>(this.recoveryProvider.list().then((items) => {
            return this.zone.run(() => {
                return items.map((item) => {
                    const command = this.recoveryProvider.getRecoveryCommand(item)
                    return this.createSession({command})
                })
            })
        }))
    }
}
