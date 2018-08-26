import { Injectable } from '@angular/core'
import { execFileSync } from 'child_process'
import AsyncLock = require('async-lock')
import { ConnectableObservable, AsyncSubject, Subject } from 'rxjs'
import { first, publish } from 'rxjs/operators'
import * as childProcess from 'child_process'

import { Logger } from 'terminus-core'
import { SessionOptions, SessionPersistenceProvider } from '../api'

declare function delay (ms: number): Promise<void>

const TMUX_CONFIG = `
    set -g status off
    set -g focus-events on
    set -g bell-action any
    set -g bell-on-alert on
    set -g visual-bell off
    set -g set-titles on
    set -g set-titles-string "#W"
    set -g window-status-format '#I:#(pwd="#{pane_current_path}"; echo \${pwd####*/})#F'
    set -g window-status-current-format '#I:#(pwd="#{pane_current_path}"; echo \${pwd####*/})#F'
    set-option -g prefix C-^
    set-option -g status-interval 1
`

export class TMuxBlock {
    time: number
    number: number
    error: boolean
    lines: string[]

    constructor (line: string) {
        this.time = parseInt(line.split(' ')[1])
        this.number = parseInt(line.split(' ')[2])
        this.lines = []
    }
}

export class TMuxMessage {
    type: string
    content: string

    constructor (line: string) {
        this.type = line.substring(0, line.indexOf(' '))
        this.content = line.substring(line.indexOf(' ') + 1)
    }
}

export class TMuxCommandProcess {
    private process: childProcess.ChildProcess
    private rawOutput$ = new Subject<string>()
    private line$ = new Subject<string>()
    private message$ = new Subject<string>()
    private block$ = new Subject<TMuxBlock>()
    private response$: ConnectableObservable<TMuxBlock>
    private lock = new AsyncLock({ timeout: 1000 })
    private logger = new Logger(null, 'tmuxProcess')

    constructor () {
        this.process = childProcess.spawn('tmux', ['-C', '-f', '/dev/null', '-L', 'terminus', 'new-session', '-A', '-D', '-s', 'control'])
        this.logger.log('started')
        this.process.stdout.on('data', data => {
            // console.debug('tmux says:', data.toString())
            this.rawOutput$.next(data.toString())
        })

        let rawBuffer = ''
        this.rawOutput$.subscribe(raw => {
            rawBuffer += raw
            if (rawBuffer.includes('\n')) {
                let lines = rawBuffer.split('\n')
                rawBuffer = lines.pop()
                lines.forEach(line => this.line$.next(line))
            }
        })

        let currentBlock = null
        this.line$.subscribe(line => {
            if (currentBlock) {
                if (line.startsWith('%end ')) {
                    let block = currentBlock
                    currentBlock = null
                    setImmediate(() => {
                        this.block$.next(block)
                    })
                } else if (line.startsWith('%error ')) {
                    let block = currentBlock
                    block.error = true
                    currentBlock = null
                    setImmediate(() => {
                        this.block$.next(block)
                    })
                } else {
                    currentBlock.lines.push(line)
                }
            } else {
                if (line.startsWith('%begin ')) {
                    currentBlock = new TMuxBlock(line)
                } else {
                    this.message$.next(line)
                }
            }
        })

        this.response$ = this.block$.asObservable().pipe(publish()) as ConnectableObservable<TMuxBlock>
        this.response$.connect()

        this.block$.subscribe(block => {
            this.logger.debug('block:', block)
        })

        this.message$.subscribe(message => {
            this.logger.debug('message:', message)
        })
    }

    command (command: string): Promise<TMuxBlock> {
        return this.lock.acquire('key', () => {
            let p = this.response$.pipe(first()).toPromise()
            this.logger.debug('command:', command)
            this.process.stdin.write(command + '\n')
            return p
        }).then(response => {
            if (response.error) {
                throw response
            }
            return response
        }) as Promise<TMuxBlock>
    }

    destroy () {
        this.rawOutput$.complete()
        this.line$.complete()
        this.block$.complete()
        this.message$.complete()
        this.process.kill('SIGTERM')
    }
}

export class TMux {
    private process: TMuxCommandProcess
    private ready: Promise<void>
    private logger = new Logger(null, 'tmux')

    constructor () {
        this.process = new TMuxCommandProcess()
        this.ready = (async () => {
            for (let line of TMUX_CONFIG.split('\n')) {
                if (line) {
                    try {
                        await this.process.command(line)
                    } catch (e) {
                        this.logger.warn('Skipping failing config line:', line)
                    }
                }
            }
            // Tmux sometimes sends a stray response block at start
            await delay(500)
        })()
    }

    async create (id: string, options: SessionOptions): Promise<void> {
        await this.ready
        let args = [options.command].concat(options.args.slice(1))
        let cmd = args.map(x => `"${x.replace('"', '\\"')}"`).join(' ')
        await this.process.command(
            `new-session -s "${id}" -d`
            + (options.cwd ? ` -c '${options.cwd.replace("'", "\\'")}'` : '')
            + ` '${cmd}'`
        )
    }

    async list (): Promise<string[]> {
        await this.ready
        let block = await this.process.command('list-sessions -F "#{session_name}"')
        return block.lines
    }

    async getPID (id: string): Promise<number|null> {
        await this.ready
        let response = await this.process.command(`list-panes -t ${id} -F "#{pane_pid}"`)
        if (response.lines.length === 0) {
            return null
        } else {
            return parseInt(response.lines[0])
        }
    }

    async terminate (id: string): Promise<void> {
        await this.ready
        this.process.command(`kill-session -t ${id}`).catch(() => {
            console.debug('Session already killed')
        })
    }
}

@Injectable()
export class TMuxPersistenceProvider extends SessionPersistenceProvider {
    id = 'tmux'
    displayName = 'Tmux'
    private tmux: TMux

    constructor () {
        super()
        if (this.isAvailable()) {
            this.tmux = new TMux()
        }
    }

    isAvailable (): boolean {
        try {
            execFileSync('tmux', ['-V'])
            return true
        } catch (_) {
            return false
        }
    }

    async attachSession (recoveryId: any): Promise<SessionOptions> {
        let sessions = await this.tmux.list()
        if (!sessions.includes(recoveryId)) {
            return null
        }
        let truePID$ = new AsyncSubject<number>()
        this.tmux.getPID(recoveryId).then(pid => {
            truePID$.next(pid)
            truePID$.complete()
        })
        return {
            command: 'tmux',
            args: ['-L', 'terminus', 'attach-session', '-d', '-t', recoveryId, ';', 'refresh-client'],
            recoveredTruePID$: truePID$.asObservable(),
            recoveryId,
        }
    }

    async startSession (options: SessionOptions): Promise<any> {
        // TODO env
        let recoveryId = Date.now().toString()
        await this.tmux.create(recoveryId, options)
        return recoveryId
    }

    async terminateSession (recoveryId: string): Promise<void> {
        await this.tmux.terminate(recoveryId)
    }
}
