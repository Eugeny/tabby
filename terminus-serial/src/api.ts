import hexdump from 'hexer'
import colors from 'ansi-colors'
import binstring from 'binstring'
import stripAnsi from 'strip-ansi'
import bufferReplace from 'buffer-replace'
import { BaseSession } from 'terminus-terminal'
import { SerialPort } from 'serialport'
import { Logger } from 'terminus-core'
import { Subject, Observable, interval } from 'rxjs'
import { debounce } from 'rxjs/operators'
import { ReadLine, createInterface as createReadline, clearLine } from 'readline'
import { PassThrough, Readable, Writable } from 'stream'

export interface LoginScript {
    expect: string
    send: string
    isRegex?: boolean
    optional?: boolean
}

export interface SerialConnection {
    name: string
    port: string
    baudrate: number
    databits: number
    stopbits: number
    parity: string
    rtscts: boolean
    xon: boolean
    xoff: boolean
    xany: boolean
    scripts?: LoginScript[]
    color?: string
    inputMode?: InputMode
    inputNewlines?: NewlineMode
    outputMode?: OutputMode
    outputNewlines?: NewlineMode
}

export const BAUD_RATES = [
    110, 150, 300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1500000,
]

export interface SerialPortInfo {
    name: string
    description?: string
}

export type InputMode = null | 'readline' | 'readline-hex' // eslint-disable-line @typescript-eslint/no-type-alias
export type OutputMode = null | 'hex' // eslint-disable-line @typescript-eslint/no-type-alias
export type NewlineMode = null | 'cr' | 'lf' | 'crlf' // eslint-disable-line @typescript-eslint/no-type-alias

export class SerialSession extends BaseSession {
    scripts?: LoginScript[]
    serial: SerialPort
    logger: Logger

    get serviceMessage$ (): Observable<string> { return this.serviceMessage }
    private serviceMessage = new Subject<string>()
    private inputReadline: ReadLine
    private inputPromptVisible = true
    private inputReadlineInStream: Readable & Writable
    private inputReadlineOutStream: Readable & Writable

    constructor (public connection: SerialConnection) {
        super()
        this.scripts = connection.scripts ?? []

        this.inputReadlineInStream = new PassThrough()
        this.inputReadlineOutStream = new PassThrough()
        this.inputReadline = createReadline({
            input: this.inputReadlineInStream,
            output: this.inputReadlineOutStream,
            terminal: true,
            prompt: this.connection.inputMode === 'readline-hex' ? 'hex> ' : '> ',
        } as any)
        this.inputReadlineOutStream.on('data', data => {
            this.emitOutput(Buffer.from(data))
        })
        this.inputReadline.on('line', line => {
            this.onInput(Buffer.from(line + '\n'))
            this.resetInputPrompt()
        })
        this.output$.pipe(debounce(() => interval(500))).subscribe(() => this.onOutputSettled())
    }

    async start (): Promise<void> {
        this.open = true

        this.serial.on('readable', () => {
            this.onOutput(this.serial.read())
        })

        this.serial.on('end', () => {
            this.logger.info('Shell session ended')
            if (this.open) {
                this.destroy()
            }
        })

        this.executeUnconditionalScripts()
    }

    write (data: Buffer): void {
        if (this.connection.inputMode?.startsWith('readline')) {
            this.inputReadlineInStream.write(data)
        } else {
            this.onInput(data)
        }
    }

    async destroy (): Promise<void> {
        this.serviceMessage.complete()
        this.inputReadline.close()
        await super.destroy()
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
    resize (_, __) {
        this.inputReadlineOutStream.emit('resize')
    }

    kill (_?: string): void {
        this.serial.close()
    }

    emitServiceMessage (msg: string): void {
        this.serviceMessage.next(msg)
        this.logger.info(stripAnsi(msg))
    }

    async getChildProcesses (): Promise<any[]> {
        return []
    }

    async gracefullyKillProcess (): Promise<void> {
        this.kill('TERM')
    }

    supportsWorkingDirectory (): boolean {
        return false
    }

    async getWorkingDirectory (): Promise<string|null> {
        return null
    }

    private replaceNewlines (data: Buffer, mode?: NewlineMode): Buffer {
        if (!mode) {
            return data
        }
        data = bufferReplace(data, '\r\n', '\n')
        data = bufferReplace(data, '\r', '\n')
        const replacement = {
            strip: '',
            cr: '\r',
            lf: '\n',
            crlf: '\r\n',
        }[mode]
        return bufferReplace(data, '\n', replacement)
    }

    private onInput (data: Buffer) {
        if (this.connection.inputMode === 'readline-hex') {
            const tokens = data.toString().split(/\s/g)
            data = Buffer.concat(tokens.filter(t => !!t).map(t => {
                if (t.startsWith('0x')) {
                    t = t.substring(2)
                }
                return binstring(t, { 'in': 'hex' })
            }))
        }

        data = this.replaceNewlines(data, this.connection.inputNewlines)
        if (this.serial) {
            this.serial.write(data.toString())
        }
    }

    private onOutputSettled () {
        if (this.connection.inputMode?.startsWith('readline') && !this.inputPromptVisible) {
            this.resetInputPrompt()
        }
    }

    private resetInputPrompt () {
        this.emitOutput(Buffer.from('\r\n'))
        this.inputReadline.prompt(true)
        this.inputPromptVisible = true
    }

    private onOutput (data: Buffer) {
        const dataString = data.toString()

        if (this.connection.inputMode?.startsWith('readline')) {
            if (this.inputPromptVisible) {
                clearLine(this.inputReadlineOutStream, 0)
                this.inputPromptVisible = false
            }
        }

        data = this.replaceNewlines(data, this.connection.outputNewlines)

        if (this.connection.outputMode === 'hex') {
            this.emitOutput(Buffer.concat([
                Buffer.from('\r\n'),
                Buffer.from(hexdump(data, {
                    group: 1,
                    gutter: 4,
                    divide: colors.gray(' ｜ '),
                    emptyHuman: colors.gray('╳'),
                }).replace(/\n/g, '\r\n')),
                Buffer.from('\r\n\n'),
            ]))
        } else {
            this.emitOutput(data)
        }

        if (this.scripts) {
            let found = false
            for (const script of this.scripts) {
                let match = false
                let cmd = ''
                if (script.isRegex) {
                    const re = new RegExp(script.expect, 'g')
                    if (re.test(dataString)) {
                        cmd = dataString.replace(re, script.send)
                        match = true
                        found = true
                    }
                } else {
                    if (dataString.includes(script.expect)) {
                        cmd = script.send
                        match = true
                        found = true
                    }
                }

                if (match) {
                    this.logger.info('Executing script: "' + cmd + '"')
                    this.serial.write(cmd + '\n')
                    this.scripts = this.scripts.filter(x => x !== script)
                } else {
                    if (script.optional) {
                        this.logger.debug('Skip optional script: ' + script.expect)
                        found = true
                        this.scripts = this.scripts.filter(x => x !== script)
                    } else {
                        break
                    }
                }
            }

            if (found) {
                this.executeUnconditionalScripts()
            }
        }
    }

    private executeUnconditionalScripts () {
        if (this.scripts) {
            for (const script of this.scripts) {
                if (!script.expect) {
                    console.log('Executing script:', script.send)
                    this.serial.write(script.send + '\n')
                    this.scripts = this.scripts.filter(x => x !== script)
                } else {
                    break
                }
            }
        }
    }
}

export interface SerialConnectionGroup {
    name: string
    connections: SerialConnection[]
}
