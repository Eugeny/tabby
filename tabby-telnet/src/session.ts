import { Socket } from 'net'
import colors from 'ansi-colors'
import stripAnsi from 'strip-ansi'
import { Injector } from '@angular/core'
import { Profile, LogService } from 'tabby-core'
import { BaseSession, LoginScriptsOptions, StreamProcessingOptions, TerminalStreamProcessor } from 'tabby-terminal'
import { Subject, Observable } from 'rxjs'


export interface TelnetProfile extends Profile {
    options: TelnetProfileOptions
}

export interface TelnetProfileOptions extends StreamProcessingOptions, LoginScriptsOptions {
    host: string
    port?: number
}

enum TelnetCommands {
    SUBOPTION_SEND = 1,
    SUBOPTION_END = 240,
    GA = 249,
    SUBOPTION = 250,
    WILL = 251,
    WONT = 252,
    DO = 253,
    DONT = 254,
    IAC = 255,
}

enum TelnetOptions {
    ECHO = 0x1,
    AUTH_OPTIONS = 0x25,
    SUPPRESS_GO_AHEAD = 0x03,
    TERMINAL_TYPE = 0x18,
    NEGO_WINDOW_SIZE = 0x1f,
    NEGO_TERMINAL_SPEED = 0x20,
    STATUS = 0x05,
    REMOTE_FLOW_CONTROL = 0x21,
    X_DISPLAY_LOCATION = 0x23,
    NEW_ENVIRON = 0x27,
}

export class TelnetSession extends BaseSession {
    get serviceMessage$ (): Observable<string> { return this.serviceMessage }

    private serviceMessage = new Subject<string>()
    private socket: Socket
    private streamProcessor: TerminalStreamProcessor
    private telnetProtocol = false
    private echoEnabled = false
    private lastWidth = 0
    private lastHeight = 0
    private requestedOptions = new Set<number>()

    constructor (
        injector: Injector,
        public profile: TelnetProfile,
    ) {
        super(injector.get(LogService).create(`telnet-${profile.options.host}-${profile.options.port}`))
        this.streamProcessor = new TerminalStreamProcessor(profile.options)
        this.streamProcessor.outputToSession$.subscribe(data => {
            this.socket.write(this.unescapeFF(data))
        })
        this.streamProcessor.outputToTerminal$.subscribe(data => {
            this.emitOutput(data)
        })
        this.setLoginScriptsOptions(profile.options)
    }

    unescapeFF (data: Buffer): Buffer {
        if (!this.telnetProtocol) {
            return data
        }
        const result: Buffer[] = []
        while (data.includes(0xff)) {
            const pos = data.indexOf(0xff)

            result.push(data.slice(0, pos))
            result.push(Buffer.from([0xff, 0xff]))

            data = data.slice(pos + 1)
        }

        result.push(data)
        return Buffer.concat(result)
    }

    async start (): Promise<void> {
        this.socket = new Socket()
        this.emitServiceMessage(`Connecting to ${this.profile.options.host}`)

        return new Promise((resolve, reject) => {
            this.socket.on('error', err => {
                this.emitServiceMessage(colors.bgRed.black(' X ') + ` Socket error: ${err as any}`)
                reject(err)
                this.destroy()
            })
            this.socket.on('close', () => {
                this.emitServiceMessage('Connection closed')
                this.destroy()
            })
            this.socket.on('data', data => this.onData(data))
            this.socket.connect(this.profile.options.port ?? 23, this.profile.options.host, () => {
                this.emitServiceMessage('Connected')
                this.open = true
                setTimeout(() => this.streamProcessor.start())
                this.loginScriptProcessor?.executeUnconditionalScripts()
                resolve()
            })
        })
    }

    requestOption (cmd: TelnetCommands, option: TelnetOptions): void {
        this.requestedOptions.add(option)
        this.emitTelnet(cmd, option)
    }

    emitServiceMessage (msg: string): void {
        this.serviceMessage.next(msg)
        this.logger.info(stripAnsi(msg))
    }

    onData (data: Buffer): void {
        if (!this.telnetProtocol && data[0] === TelnetCommands.IAC) {
            this.telnetProtocol = true
            this.requestOption(TelnetCommands.DO, TelnetOptions.SUPPRESS_GO_AHEAD)
            this.emitTelnet(TelnetCommands.WILL, TelnetOptions.TERMINAL_TYPE)
            this.emitTelnet(TelnetCommands.WILL, TelnetOptions.NEGO_WINDOW_SIZE)
        }
        if (this.telnetProtocol) {
            data = this.processTelnetProtocol(data)
        }
        this.streamProcessor.feedFromSession(data)
    }

    emitTelnet (command: TelnetCommands, option: TelnetOptions): void {
        this.logger.debug('>', TelnetCommands[command], TelnetOptions[option] || option)
        this.socket.write(Buffer.from([TelnetCommands.IAC, command, option]))
    }

    emitTelnetSuboption (option: TelnetOptions, value: Buffer): void {
        this.logger.debug('>', 'SUBOPTION', TelnetOptions[option], value)
        this.socket.write(Buffer.from([
            TelnetCommands.IAC,
            TelnetCommands.SUBOPTION,
            option,
            ...value,
            TelnetCommands.IAC,
            TelnetCommands.SUBOPTION_END,
        ]))
    }

    processTelnetProtocol (data: Buffer): Buffer {
        while (data.length) {
            if (data[0] === TelnetCommands.IAC) {
                const command = data[1]
                const commandName = TelnetCommands[command]
                const option = data[2]
                const optionName = TelnetOptions[option]

                if (command === TelnetCommands.IAC) {
                    data = data.slice(1)
                    break
                }

                data = data.slice(3)
                this.logger.debug('<', commandName || command, optionName || option)

                if (command === TelnetCommands.WILL || command === TelnetCommands.WONT) {
                    if (this.requestedOptions.has(option)) {
                        this.requestedOptions.delete(option)
                        continue
                    }
                }

                if (command === TelnetCommands.WILL) {
                    if ([
                        TelnetOptions.SUPPRESS_GO_AHEAD,
                        TelnetOptions.ECHO,
                    ].includes(option)) {
                        this.emitTelnet(TelnetCommands.DO, option)
                    } else {
                        this.logger.debug('(!) Unhandled option')
                        this.emitTelnet(TelnetCommands.DONT, option)
                    }
                }
                if (command === TelnetCommands.DO) {
                    if (option === TelnetOptions.NEGO_WINDOW_SIZE) {
                        this.emitTelnet(TelnetCommands.WILL, option)
                        this.emitSize()
                    } else if (option === TelnetOptions.ECHO) {
                        this.echoEnabled = true
                        this.emitTelnet(TelnetCommands.WILL, option)
                    } else if (option === TelnetOptions.TERMINAL_TYPE) {
                        this.emitTelnet(TelnetCommands.WILL, option)
                    } else {
                        this.logger.debug('(!) Unhandled option')
                        this.emitTelnet(TelnetCommands.WONT, option)
                    }
                }
                if (command === TelnetCommands.DONT) {
                    if (option === TelnetOptions.ECHO) {
                        this.echoEnabled = false
                        this.emitTelnet(TelnetCommands.WONT, option)
                    } else {
                        this.logger.debug('(!) Unhandled option')
                        this.emitTelnet(TelnetCommands.WILL, option)
                    }
                }
                if (command === TelnetCommands.SUBOPTION) {
                    const endIndex = data.indexOf(TelnetCommands.IAC)
                    const optionValue = data.slice(0, endIndex)
                    this.logger.debug('<', commandName || command, optionName || option, optionValue)

                    if (option === TelnetOptions.TERMINAL_TYPE && optionValue[0] === TelnetCommands.SUBOPTION_SEND) {
                        this.emitTelnetSuboption(option, Buffer.from([0, ...Buffer.from('XTERM-256COLOR')]))
                    }

                    data = data.slice(endIndex + 2)
                }
            } else {
                return data
            }
        }
        return data
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    resize (w: number, h: number): void {
        if (w && h) {
            this.lastWidth = w
            this.lastHeight = h
        }
        if (this.lastWidth && this.lastHeight && this.telnetProtocol) {
            this.emitSize()
        }
    }

    private emitSize () {
        if (this.lastWidth && this.lastHeight) {
            this.emitTelnetSuboption(TelnetOptions.NEGO_WINDOW_SIZE, Buffer.from([
                this.lastWidth >> 8, this.lastWidth & 0xff,
                this.lastHeight >> 8, this.lastHeight & 0xff,
            ]))
        } else {
            this.emitTelnet(TelnetCommands.WONT, TelnetOptions.NEGO_WINDOW_SIZE)
        }
    }

    write (data: Buffer): void {
        if (this.echoEnabled) {
            this.emitOutput(data)
        }
        this.streamProcessor.feedFromTerminal(data)
    }

    kill (_signal?: string): void {
        this.socket.destroy()
    }

    async destroy (): Promise<void> {
        this.streamProcessor.close()
        this.serviceMessage.complete()
        this.kill()
        await super.destroy()
    }

    async getChildProcesses (): Promise<any[]> {
        return []
    }

    async gracefullyKillProcess (): Promise<void> {
        this.kill()
    }

    supportsWorkingDirectory (): boolean {
        return false
    }

    async getWorkingDirectory (): Promise<string|null> {
        return null
    }
}
