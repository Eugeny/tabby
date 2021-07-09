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

export class TelnetSession extends BaseSession {
    get serviceMessage$ (): Observable<string> { return this.serviceMessage }

    private serviceMessage = new Subject<string>()
    private socket: Socket
    private streamProcessor: TerminalStreamProcessor

    constructor (
        injector: Injector,
        public profile: TelnetProfile,
    ) {
        super(injector.get(LogService).create(`telnet-${profile.options.host}-${profile.options.port}`))
        this.streamProcessor = new TerminalStreamProcessor(profile.options)
        this.streamProcessor.outputToSession$.subscribe(data => {
            this.socket.write(data)
        })
        this.streamProcessor.outputToTerminal$.subscribe(data => {
            this.emitOutput(data)
        })
        this.setLoginScriptsOptions(profile.options)
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
            this.socket.on('data', data => this.streamProcessor.feedFromSession(data))
            this.socket.connect(this.profile.options.port ?? 23, this.profile.options.host, () => {
                this.emitServiceMessage('Connected')
                this.open = true
                setTimeout(() => this.streamProcessor.start())
                this.loginScriptProcessor?.executeUnconditionalScripts()
                resolve()
            })
        })
    }

    emitServiceMessage (msg: string): void {
        this.serviceMessage.next(msg)
        this.logger.info(stripAnsi(msg))
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    resize (_w: number, _h: number): void { }

    write (data: Buffer): void {
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
