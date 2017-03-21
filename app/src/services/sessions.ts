import { Injectable, NgZone, EventEmitter } from '@angular/core'
import { Logger, LogService } from 'services/log'
const exec = require('child-process-promise').exec
import * as nodePTY from 'node-pty'
import * as fs from 'fs'


export interface ISessionRecoveryProvider {
    list (): Promise<any[]>
    getRecoverySession (recoveryId: any): SessionOptions
    wrapNewSession (options: SessionOptions): SessionOptions
    terminateSession (recoveryId: string): Promise<any>
}

export class NullSessionRecoveryProvider implements ISessionRecoveryProvider {
    async list (): Promise<any[]> {
        return []
    }

    getRecoverySession (_recoveryId: any): SessionOptions {
        return null
    }

    wrapNewSession (options: SessionOptions): SessionOptions {
        return options
    }

    async terminateSession (_recoveryId: string): Promise<any> {
        return null
    }
}

export class ScreenSessionRecoveryProvider implements ISessionRecoveryProvider {
    list(): Promise<any[]> {
        return exec('screen -list').then((result) => {
            return result.stdout.split('\n')
                .filter((line) => /\bterm-tab-/.exec(line))
                .map((line) => line.trim().split('.')[0])
        }).catch(() => {
            return []
        })
    }

    getRecoverySession (recoveryId: any): SessionOptions {
        return {
            command: 'screen',
            args: ['-r', recoveryId],
        }
    }

    wrapNewSession (options: SessionOptions): SessionOptions {
        // TODO
        let configPath = '/tmp/.termScreenConfig'
        fs.writeFileSync(configPath, `
            escape ^^^
            vbell off
            term xterm-color
            bindkey "^[OH" beginning-of-line
            bindkey "^[OF" end-of-line
            termcapinfo xterm* 'hs:ts=\\E]0;:fs=\\007:ds=\\E]0;\\007'
            defhstatus "^Et"
            hardstatus off
        `, 'utf-8')
        let recoveryId = `term-tab-${Date.now()}`
        options.args = ['-c', configPath, '-U', '-S', recoveryId, '--', options.command].concat(options.args || [])
        options.command = 'screen'
        options.recoveryId = recoveryId
        return options
    }

    async terminateSession (recoveryId: string): Promise<any> {
        return exec(`screen -S ${recoveryId} -X quit`)
    }
}


export interface SessionOptions {
    name?: string,
    command?: string,
    args?: string[],
    cwd?: string,
    env?: any,
    recoveryId?: string
}

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
    recoveryProvider: ISessionRecoveryProvider

    constructor(
        private zone: NgZone,
        log: LogService,
    ) {
        this.logger = log.create('sessions')
        this.recoveryProvider = new ScreenSessionRecoveryProvider()
        //this.recoveryProvider = new NullSessionRecoveryProvider()
    }

    createNewSession (options: SessionOptions) : Session {
        options = this.recoveryProvider.wrapNewSession(options)
        let session = this.createSession(options)
        session.recoveryId = options.recoveryId
        return session
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

    async destroySession (session: Session): Promise<any> {
        await session.gracefullyDestroy()
        await this.recoveryProvider.terminateSession(session.recoveryId)
        return null
    }

    recoverAll () : Promise<Session[]> {
        return <Promise<Session[]>>(this.recoveryProvider.list().then((items) => {
            return this.zone.run(() => {
                return items.map((recoveryId) => {
                    const options = this.recoveryProvider.getRecoverySession(recoveryId)
                    let session = this.createSession(options)
                    session.recoveryId = recoveryId
                    return session
                })
            })
        }))
    }
}
