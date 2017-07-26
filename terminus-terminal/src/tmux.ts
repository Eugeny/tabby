import { Injectable } from '@angular/core'
import * as AsyncLock from 'async-lock'
import { ConnectableObservable, Subject } from 'rxjs'
import * as childProcess from 'child_process'
import { SessionOptions, SessionPersistenceProvider } from './api'

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

    constructor () {
        this.process = childProcess.spawn('tmux', ['-C', '-L', 'terminus', 'new-session', '-A', '-D', '-s', 'control'])
        console.log('[tmux] started')
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

        this.response$ = this.block$.skip(1).publish()
        this.response$.connect()

        this.block$.subscribe(block => {
            console.debug('[tmux] block:', block)
        })

        this.message$.subscribe(message => {
            console.debug('[tmux] message:', message)
        })
    }

    command (command: string): Promise<TMuxBlock> {
        return this.lock.acquire('key', () => {
            let p = this.response$.take(1).toPromise()
            console.debug('[tmux] command:', command)
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

    constructor () {
        this.process = new TMuxCommandProcess()
        TMUX_CONFIG.split('\n').filter(x => x).forEach(async (line) => {
            await this.process.command(line)
        })
    }

    async create (id: string, options: SessionOptions): Promise<void> {
        let args = [options.command].concat(options.args)
        let cmd = args.map(x => `"${x.replace('"', '\\"')}"`)
        await this.process.command(
            `new-session -s "${id}" -d`
            + (options.cwd ? ` -c '${options.cwd.replace("'", "\\'")}'` : '')
            + ` '${cmd}'`
        )
    }

    async list (): Promise<string[]> {
        let block = await this.process.command('list-sessions -F "#{session_name}"')
        return block.lines
    }

    async terminate (id: string): Promise<void> {
        await this.process.command(`kill-session -t ${id}`)
    }
}

@Injectable()
export class TMuxPersistenceProvider extends SessionPersistenceProvider {
    private tmux: TMux

    constructor () {
        super()
        this.tmux = new TMux()
    }

    async attachSession (recoveryId: any): Promise<SessionOptions> {
        let sessions = await this.tmux.list()
        if (!sessions.includes(recoveryId)) {
            return null
        }
        return {
            command: 'tmux',
            args: ['-L', 'terminus', 'attach-session', '-d', '-t', recoveryId],
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
