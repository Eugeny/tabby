import * as nodePTY from 'node-pty'
import { v4 as uuidv4 } from 'uuid'
import { ipcMain } from 'electron'
import { Application } from './app'
import { UTF8Splitter } from './utfSplitter'
import { Subject, debounceTime } from 'rxjs'
import { execSync } from 'child_process'

class PTYDataQueue {
    private buffers: Buffer[] = []
    private delta = 0
    private maxChunk = 1024 * 100
    private maxDelta = this.maxChunk * 5
    private flowPaused = false
    private decoder = new UTF8Splitter()
    private output$ = new Subject<Buffer>()

    constructor (private pty: nodePTY.IPty, private onData: (data: Buffer) => void) {
        this.output$.pipe(debounceTime(500)).subscribe(() => {
            const remainder = this.decoder.flush()
            if (remainder.length) {
                this.onData(remainder)
            }
        })
    }

    push (data: Buffer) {
        this.buffers.push(data)
        this.maybeEmit()
    }

    ack (length: number) {
        this.delta -= length
        this.maybeEmit()
    }

    private maybeEmit () {
        if (this.delta <= this.maxDelta && this.flowPaused) {
            this.resume()
            return
        }
        if (this.buffers.length > 0) {
            if (this.delta > this.maxDelta && !this.flowPaused) {
                this.pause()
                return
            }

            const buffersToSend = []
            let totalLength = 0
            while (totalLength < this.maxChunk && this.buffers.length) {
                totalLength += this.buffers[0].length
                buffersToSend.push(this.buffers.shift())
            }

            if (buffersToSend.length === 0) {
                return
            }

            let toSend = Buffer.concat(buffersToSend)
            if (toSend.length > this.maxChunk) {
                this.buffers.unshift(toSend.slice(this.maxChunk))
                toSend = toSend.slice(0, this.maxChunk)
            }
            this.emitData(toSend)
            this.delta += toSend.length

            if (this.buffers.length) {
                setImmediate(() => this.maybeEmit())
            }
        }
    }

    private emitData (data: Buffer) {
        const validChunk = this.decoder.write(data)
        this.onData(validChunk)
        this.output$.next(validChunk)
    }

    private pause () {
        this.pty.pause()
        this.flowPaused = true
    }

    private resume () {
        this.pty.resume()
        this.flowPaused = false
        this.maybeEmit()
    }
}

export class PTY {
    private pty: nodePTY.IPty
    private outputQueue: PTYDataQueue
    exited = false

    constructor(private id: string, private app: Application, ...args: any[])
    {

        const env = process.platform === 'win32' ? refreshenvFromRegistery() : args
        const origin_env = args["2"].env;
        const newEnv  =  Object.assign(origin_env, env)
        args["2"].env = newEnv
        this.pty = (nodePTY as any).spawn(...args)
        for (const key of ['close', 'exit']) {
            (this.pty as any).on(key, (...eventArgs) => this.emit(key, ...eventArgs))
        }

        this.outputQueue = new PTYDataQueue(this.pty, data => {
            setImmediate(() => this.emit('data', data))
        })

        this.pty.onData(data => this.outputQueue.push(Buffer.from(data)))
        this.pty.onExit(() => {
            this.exited = true
        })
    }

    getPID (): number {
        return this.pty.pid
    }

    resize (columns: number, rows: number): void {
        if ((this.pty as any)._writable) {
            this.pty.resize(columns, rows)
        }
    }

    write (buffer: Buffer): void {
        if ((this.pty as any)._writable) {
            this.pty.write(buffer as any)
        }
    }

    ackData (length: number): void {
        this.outputQueue.ack(length)
    }

    kill (signal?: string): void {
        this.pty.kill(signal)
    }

    private emit (event: string, ...args: any[]) {
        this.app.broadcast(`pty:${this.id}:${event}`, ...args)
    }
}


function refreshenvFromRegistery()
{

    function getUserEnvFromRegistry(): Record<string, string>
    {
        const env: Record<string, string> = {}
        try
        {
            const output = execSync('reg query "HKCU\\Environment"', { encoding: 'utf-8' })
            const lines = output.split(/\r?\n/)
            for (const line of lines)
            {
                const match = line.match(/^\s*(\w+)\s+REG_\w+\s+(.*)$/)
                if (match)
                {
                    const [, key, value] = match
                    env[key] = value
                }
            }
        } catch (err)
        {
            console.error('读取注册表失败', err)
        }
        return env
    }

    /**
     * 从注册表中读取系统环境变量（HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment）
     */
    function getSystemEnvFromRegistry(): Record<string, string>
    {
        const env: Record<string, string> = {}
        try
        {
            const output = execSync(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment"',
                { encoding: 'utf-8' }
            )
            const lines = output.split(/\r?\n/)
            for (const line of lines)
            {
                const match = line.match(/^\s*(\w+)\s+REG_\w+\s+(.*)$/)
                if (match)
                {
                    const [, key, value] = match
                    env[key] = value
                }
            }
        } catch (err)
        {
            console.error('读取系统注册表失败', err)
        }
        return env
    }

    const userEnv = getUserEnvFromRegistry()
    const systemEnv = getSystemEnvFromRegistry()
    const env = { ...userEnv, ...systemEnv }

    return env;
}
export class PTYManager {
    private ptys: Record<string, PTY | undefined> = {}

    init (app: Application): void {
        ipcMain.on('pty:spawn', (event, ...options) => {
            const id = uuidv4().toString()
            event.returnValue = id
            this.ptys[id] = new PTY(id, app, ...options)
        })

        ipcMain.on('pty:exists', (event, id) => {
            event.returnValue = this.ptys[id] && !this.ptys[id].exited
        })

        ipcMain.on('pty:get-pid', (event, id) => {
            event.returnValue = this.ptys[id]?.getPID()
        })

        ipcMain.on('pty:resize', (_event, id, columns, rows) => {
            this.ptys[id]?.resize(columns, rows)
        })

        ipcMain.on('pty:write', (_event, id, data) => {
            this.ptys[id]?.write(Buffer.from(data))
        })

        ipcMain.on('pty:kill', (_event, id, signal) => {
            this.ptys[id]?.kill(signal)
        })

        ipcMain.on('pty:ack-data', (_event, id, length) => {
            this.ptys[id]?.ackData(length)
        })
    }
}
