import * as psNode from 'ps-node'
import * as fs from 'mz/fs'
import { Injector } from '@angular/core'
import { HostAppService, ConfigService, WIN_BUILD_CONPTY_SUPPORTED, isWindowsBuild, Platform, BootstrapData, BOOTSTRAP_DATA, LogService } from 'tabby-core'
import { BaseSession } from 'tabby-terminal'
import { ipcRenderer } from 'electron'
import { getWorkingDirectoryFromPID } from 'native-process-working-directory'
import { SessionOptions, ChildProcess } from './api'

/* eslint-disable block-scoped-var */

try {
    var macOSNativeProcessList = require('macos-native-processlist')  // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

try {
    var windowsProcessTree = require('windows-process-tree')  // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

const windowsDirectoryRegex = /([a-zA-Z]:[^\:\[\]\?\"\<\>\|]+)/mi

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PTYProxy {
    private id: string
    private subscriptions: Map<string, any> = new Map()

    static spawn (...options: any[]): PTYProxy {
        return new PTYProxy(null, ...options)
    }

    static restore (id: string): PTYProxy|null {
        if (ipcRenderer.sendSync('pty:exists', id)) {
            return new PTYProxy(id)
        }
        return null
    }

    private constructor (id: string|null, ...options: any[]) {
        if (id) {
            this.id = id
        } else {
            this.id = ipcRenderer.sendSync('pty:spawn', ...options)
        }
    }

    getPTYID (): string {
        return this.id
    }

    getPID (): number {
        return ipcRenderer.sendSync('pty:get-pid', this.id)
    }

    subscribe (event: string, handler: (..._: any[]) => void): void {
        const key = `pty:${this.id}:${event}`
        const newHandler = (_event, ...args) => handler(...args)
        this.subscriptions.set(key, newHandler)
        ipcRenderer.on(key, newHandler)
    }

    ackData (length: number): void {
        ipcRenderer.send('pty:ack-data', this.id, length)
    }

    unsubscribeAll (): void {
        for (const k of this.subscriptions.keys()) {
            ipcRenderer.off(k, this.subscriptions.get(k))
        }
    }

    resize (columns: number, rows: number): void {
        ipcRenderer.send('pty:resize', this.id, columns, rows)
    }

    write (data: Buffer): void {
        ipcRenderer.send('pty:write', this.id, data)
    }

    kill (signal?: string): void {
        ipcRenderer.send('pty:kill', this.id, signal)
    }
}

function mergeEnv (...envs) {
    const result = {}
    const keyMap = {}
    for (const env of envs) {
        for (const [key, value] of Object.entries(env)) {
            // const lookup = process.platform === 'win32' ? key.toLowerCase() : key
            const lookup = key.toLowerCase()
            keyMap[lookup] ??= key
            result[keyMap[lookup]] = value
        }
    }
    return result
}

function substituteEnv (env: Record<string, string>) {
    env = { ...env }
    const pattern = process.platform === 'win32' ? /%(\w+)%/g : /\$(\w+)\b/g
    for (const [key, value] of Object.entries(env)) {
        env[key] = value.replace(pattern, function (substring, p1) {
            if (process.platform === 'win32') {
                return Object.entries(process.env).find(x => x[0].toLowerCase() === p1.toLowerCase())?.[1] ?? ''
            } else {
                return process.env[p1] ?? ''
            }
        })
    }
    return env
}

/** @hidden */
export class Session extends BaseSession {
    private pty: PTYProxy|null = null
    private ptyClosed = false
    private pauseAfterExit = false
    private guessedCWD: string|null = null
    private initialCWD: string|null = null
    private config: ConfigService
    private hostApp: HostAppService
    private bootstrapData: BootstrapData

    constructor (injector: Injector) {
        super(injector.get(LogService).create('local'))
        this.config = injector.get(ConfigService)
        this.hostApp = injector.get(HostAppService)
        this.bootstrapData = injector.get(BOOTSTRAP_DATA)
    }

    start (options: SessionOptions): void {
        let pty: PTYProxy|null = null

        if (options.restoreFromPTYID) {
            pty = PTYProxy.restore(options.restoreFromPTYID)
            options.restoreFromPTYID = undefined
        }

        if (!pty) {
            let env = mergeEnv(
                process.env,
                {
                    TERM: 'xterm-256color',
                    TERM_PROGRAM: 'Tabby',
                },
                substituteEnv(options.env ?? {}),
                this.config.store.terminal.environment || {},
            )

            if (this.hostApp.platform === Platform.Windows && this.config.store.terminal.setComSpec) {
                env = mergeEnv(env, { COMSPEC: this.bootstrapData.executable })
            }

            delete env['']

            if (this.hostApp.platform === Platform.macOS && !process.env.LC_ALL) {
                const locale = process.env.LC_CTYPE ?? 'en_US.UTF-8'
                Object.assign(env, {
                    LANG: locale,
                    LC_ALL: locale,
                    LC_MESSAGES: locale,
                    LC_NUMERIC: locale,
                    LC_COLLATE: locale,
                    LC_MONETARY: locale,
                })
            }

            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            let cwd = options.cwd || process.env.HOME

            if (!fs.existsSync(cwd)) {
                console.warn('Ignoring non-existent CWD:', cwd)
                cwd = undefined
            }

            pty = PTYProxy.spawn(options.command, options.args ?? [], {
                name: 'xterm-256color',
                cols: options.width ?? 80,
                rows: options.height ?? 30,
                encoding: null,
                cwd,
                env: env,
                // `1` instead of `true` forces ConPTY even if unstable
                useConpty: isWindowsBuild(WIN_BUILD_CONPTY_SUPPORTED) && this.config.store.terminal.useConPTY ? 1 : false,
            })

            this.guessedCWD = cwd ?? null
        }

        this.pty = pty

        this.truePID = this.pty.getPID()

        setTimeout(async () => {
            // Retrieve any possible single children now that shell has fully started
            let processes = await this.getChildProcesses()
            while (processes.length === 1) {
                this.truePID = processes[0].pid
                processes = await this.getChildProcesses()
            }
            this.initialCWD = await this.getWorkingDirectory()
        }, 2000)

        this.open = true

        this.pty.subscribe('data', (array: Uint8Array) => {
            this.pty!.ackData(array.length)
            const data = Buffer.from(array)
            this.emitOutput(data)
            if (this.hostApp.platform === Platform.Windows) {
                this.guessWindowsCWD(data.toString())
            }
        })

        this.pty.subscribe('exit', () => {
            if (this.pauseAfterExit) {
                return
            } else if (this.open) {
                this.destroy()
            }
        })

        this.pty.subscribe('close', () => {
            this.ptyClosed = true
            if (this.pauseAfterExit) {
                this.emitOutput(Buffer.from('\r\nPress any key to close\r\n'))
            } else if (this.open) {
                this.destroy()
            }
        })

        this.pauseAfterExit = options.pauseAfterExit ?? false

        this.destroyed$.subscribe(() => this.pty!.unsubscribeAll())
    }

    getPTYID (): string|null {
        return this.pty?.getPTYID() ?? null
    }

    resize (columns: number, rows: number): void {
        this.pty?.resize(columns, rows)
    }

    write (data: Buffer): void {
        if (this.ptyClosed) {
            this.destroy()
        }
        if (this.open) {
            this.pty?.write(data)
        }
    }

    kill (signal?: string): void {
        this.pty?.kill(signal)
    }

    async getChildProcesses (): Promise<ChildProcess[]> {
        if (!this.truePID) {
            return []
        }
        if (this.hostApp.platform === Platform.macOS) {
            const processes = await macOSNativeProcessList.getProcessList()
            return processes.filter(x => x.ppid === this.truePID).map(p => ({
                pid: p.pid,
                ppid: p.ppid,
                command: p.name,
            }))
        }
        if (this.hostApp.platform === Platform.Windows) {
            return new Promise<ChildProcess[]>(resolve => {
                windowsProcessTree.getProcessTree(this.truePID, tree => {
                    resolve(tree ? tree.children.map(child => ({
                        pid: child.pid,
                        ppid: tree.pid,
                        command: child.name,
                    })) : [])
                })
            })
        }
        return new Promise<ChildProcess[]>((resolve, reject) => {
            psNode.lookup({ ppid: this.truePID }, (err, processes) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(processes as ChildProcess[])
            })
        })
    }

    async gracefullyKillProcess (): Promise<void> {
        if (this.hostApp.platform === Platform.Windows) {
            this.kill()
        } else {
            await new Promise<void>((resolve) => {
                this.kill('SIGTERM')
                setImmediate(() => {
                    try {
                        process.kill(this.pty!.getPID(), 0)
                        // still alive
                        setTimeout(() => {
                            this.kill('SIGKILL')
                            resolve()
                        }, 1000)
                    } catch {
                        resolve()
                    }
                })
            })
        }
    }

    supportsWorkingDirectory (): boolean {
        return !!(this.truePID ?? this.reportedCWD ?? this.guessedCWD)
    }

    async getWorkingDirectory (): Promise<string|null> {
        if (this.reportedCWD) {
            return this.reportedCWD
        }
        if (!this.truePID) {
            return null
        }
        let cwd: string|null = null
        try {
            cwd = getWorkingDirectoryFromPID(this.truePID)
        } catch (exc) {
            console.info('Could not read working directory:', exc)
        }

        try {
            cwd = await fs.realpath(cwd)
        } catch {}

        if (this.hostApp.platform === Platform.Windows && (cwd === this.initialCWD || cwd === process.env.WINDIR)) {
            // shell doesn't truly change its process' CWD
            cwd = null
        }

        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        cwd = cwd || this.guessedCWD

        try {
            await fs.access(cwd)
        } catch {
            return null
        }
        return cwd
    }

    private guessWindowsCWD (data: string) {
        const match = windowsDirectoryRegex.exec(data)
        if (match) {
            this.guessedCWD = match[0]
        }
    }
}
