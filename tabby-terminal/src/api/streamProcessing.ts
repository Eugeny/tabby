import hexdump from 'hexer'
import bufferReplace from 'buffer-replace'
import colors from 'ansi-colors'
import binstring from 'binstring'
import { Subject, Observable, interval, debounce } from 'rxjs'
import { PassThrough, Readable, Writable } from 'stream'
import { ReadLine, createInterface as createReadline, clearLine } from 'readline'

export type InputMode = null | 'local-echo' | 'readline' | 'readline-hex' // eslint-disable-line @typescript-eslint/no-type-alias
export type OutputMode = null | 'hex' // eslint-disable-line @typescript-eslint/no-type-alias
export type NewlineMode = null | 'cr' | 'lf' | 'crlf' // eslint-disable-line @typescript-eslint/no-type-alias

export interface StreamProcessingOptions {
    inputMode?: InputMode
    inputNewlines?: NewlineMode
    outputMode?: OutputMode
    outputNewlines?: NewlineMode
}

export class TerminalStreamProcessor {
    get outputToSession$ (): Observable<Buffer> { return this.outputToSession }
    get outputToTerminal$ (): Observable<Buffer> { return this.outputToTerminal }

    protected outputToSession = new Subject<Buffer>()
    protected outputToTerminal = new Subject<Buffer>()

    private inputReadline: ReadLine
    private inputPromptVisible = false
    private inputReadlineInStream: Readable & Writable
    private inputReadlineOutStream: Readable & Writable
    private started = false

    constructor (private options: StreamProcessingOptions) {
        this.inputReadlineInStream = new PassThrough()
        this.inputReadlineOutStream = new PassThrough()
        this.inputReadlineOutStream.on('data', data => {
            this.outputToTerminal.next(Buffer.from(data))
        })
        this.outputToTerminal$.pipe(debounce(() => interval(500))).subscribe(() => {
            if (this.started) {
                this.onOutputSettled()
            }
        })
    }

    start (): void {
        this.inputReadline = createReadline({
            input: this.inputReadlineInStream,
            output: this.inputReadlineOutStream,
            terminal: true,
            prompt: this.options.inputMode === 'readline-hex' ? 'hex> ' : '> ',
        })
        this.inputReadline.on('line', line => {
            this.onTerminalInput(Buffer.from(line + '\n'))
            this.resetInputPrompt()
        })
        this.started = true
    }

    feedFromSession (data: Buffer): void {
        if (this.options.inputMode?.startsWith('readline')) {
            if (this.inputPromptVisible) {
                clearLine(this.inputReadlineOutStream, 0)
                this.outputToTerminal.next(Buffer.from('\r'))
                this.inputPromptVisible = false
            }
        }

        data = this.replaceNewlines(data, this.options.outputNewlines)

        if (this.options.outputMode === 'hex') {
            this.outputToTerminal.next(Buffer.concat([
                Buffer.from('\r\n'),
                Buffer.from(hexdump(data, {
                    group: 1,
                    gutter: 4,
                    divide: colors.gray(' ｜ '),
                    emptyHuman: colors.gray('╳'),
                }).replaceAll('\n', '\r\n')),
                Buffer.from('\r\n\n'),
            ]))
        } else {
            this.outputToTerminal.next(data)
        }
    }

    feedFromTerminal (data: Buffer): void {
        if (this.options.inputMode === 'local-echo') {
            this.outputToTerminal.next(this.replaceNewlines(data, 'crlf'))
        }
        if (this.options.inputMode?.startsWith('readline')) {
            this.inputReadlineInStream.write(data)
        } else {
            this.onTerminalInput(data)
        }
    }

    resize (): void {
        if (this.options.inputMode?.startsWith('readline')) {
            this.inputReadlineOutStream.emit('resize')
        }
    }

    close (): void {
        this.inputReadline.close()
        this.outputToSession.complete()
        this.outputToTerminal.complete()
    }

    private onTerminalInput (data: Buffer) {
        if (this.options.inputMode === 'readline-hex') {
            const tokens = data.toString().split(/\s/g)
            data = Buffer.concat(tokens.filter(t => !!t).map(t => {
                if (t.startsWith('0x')) {
                    t = t.substring(2)
                }
                return binstring(t, { 'in': 'hex' })
            }))
        }

        data = this.replaceNewlines(data, this.options.inputNewlines)
        this.outputToSession.next(data)
    }

    private onOutputSettled () {
        if (this.options.inputMode?.startsWith('readline') && !this.inputPromptVisible) {
            this.resetInputPrompt()
        }
    }

    private resetInputPrompt () {
        this.outputToTerminal.next(Buffer.from('\r\n'))
        this.inputReadline.prompt(true)
        this.inputPromptVisible = true
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
}
