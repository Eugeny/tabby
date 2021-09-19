import { Observable, Subject } from 'rxjs'
import { Logger } from 'tabby-core'
import { LoginScriptProcessor, LoginScriptsOptions } from './api/loginScriptProcessing'
import { OSCProcessor } from './api/osc1337Processing'

/**
 * A session object for a [[BaseTerminalTabComponent]]
 * Extend this to implement custom I/O and process management for your terminal tab
 */
export abstract class BaseSession {
    open: boolean
    truePID?: number
    oscProcessor = new OSCProcessor()
    protected output = new Subject<string>()
    protected binaryOutput = new Subject<Buffer>()
    protected closed = new Subject<void>()
    protected destroyed = new Subject<void>()
    protected loginScriptProcessor: LoginScriptProcessor | null = null
    protected reportedCWD?: string
    private initialDataBuffer = Buffer.from('')
    private initialDataBufferReleased = false

    get output$ (): Observable<string> { return this.output }
    get binaryOutput$ (): Observable<Buffer> { return this.binaryOutput }
    get closed$ (): Observable<void> { return this.closed }
    get destroyed$ (): Observable<void> { return this.destroyed }

    constructor (protected logger: Logger) {
        this.oscProcessor.cwdReported$.subscribe(cwd => {
            this.reportedCWD = cwd
        })
    }

    emitOutput (data: Buffer): void {
        data = this.oscProcessor.process(data)
        if (!this.initialDataBufferReleased) {
            this.initialDataBuffer = Buffer.concat([this.initialDataBuffer, data])
        } else {
            this.output.next(data.toString())
            this.binaryOutput.next(data)
            this.loginScriptProcessor?.feedFromSession(data)
        }
    }

    releaseInitialDataBuffer (): void {
        this.initialDataBufferReleased = true
        this.output.next(this.initialDataBuffer.toString())
        this.binaryOutput.next(this.initialDataBuffer)
        this.initialDataBuffer = Buffer.from('')
    }

    setLoginScriptsOptions (options: LoginScriptsOptions): void {
        this.loginScriptProcessor?.close()
        this.loginScriptProcessor = new LoginScriptProcessor(this.logger, options)
        this.loginScriptProcessor.outputToSession$.subscribe(data => this.write(data))
    }

    async destroy (): Promise<void> {
        if (this.open) {
            this.logger.info('Destroying')
            this.open = false
            this.loginScriptProcessor?.close()
            this.closed.next()
            this.destroyed.next()
            await this.gracefullyKillProcess()
        }
        this.oscProcessor.close()
        this.closed.complete()
        this.destroyed.complete()
        this.output.complete()
        this.binaryOutput.complete()
    }

    abstract start (options: unknown): void
    abstract resize (columns: number, rows: number): void
    abstract write (data: Buffer): void
    abstract kill (signal?: string): void
    abstract gracefullyKillProcess (): Promise<void>
    abstract supportsWorkingDirectory (): boolean
    abstract getWorkingDirectory (): Promise<string|null>
}
