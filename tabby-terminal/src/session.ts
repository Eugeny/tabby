import { Observable, Subject } from 'rxjs'
import { Logger } from 'tabby-core'
import { LoginScriptProcessor, LoginScriptsOptions } from './middleware/loginScriptProcessing'
import { OSCProcessor } from './middleware/oscProcessing'
import { SessionMiddlewareStack } from './api/middleware'

/** Output kept for a session whose terminal hasn't been shown yet (tab never focused) */
const MAX_INITIAL_DATA_BUFFER = 8 * 1024 * 1024

/**
 * A session object for a [[BaseTerminalTabComponent]]
 * Extend this to implement custom I/O and process management for your terminal tab
 */
export abstract class BaseSession {
    open: boolean
    readonly oscProcessor = new OSCProcessor()
    readonly middleware = new SessionMiddlewareStack()
    protected output = new Subject<string>()
    protected binaryOutput = new Subject<Buffer>()
    protected closed = new Subject<void>()
    protected destroyed = new Subject<void>()
    protected loginScriptProcessor: LoginScriptProcessor | null = null
    protected reportedCWD?: string
    private initialDataBuffer: Buffer[] = []
    private initialDataBufferLength = 0
    private initialDataBufferTruncated = false
    private initialDataBufferReleased = false

    get output$ (): Observable<string> { return this.output }
    get binaryOutput$ (): Observable<Buffer> { return this.binaryOutput }
    get closed$ (): Observable<void> { return this.closed }
    get destroyed$ (): Observable<void> { return this.destroyed }

    constructor (protected logger: Logger) {
        this.middleware.push(this.oscProcessor)
        this.oscProcessor.cwdReported$.subscribe(cwd => {
            this.reportedCWD = cwd
        })

        this.middleware.outputToTerminal$.subscribe(data => {
            if (!this.initialDataBufferReleased) {
                // Collect chunks instead of Buffer.concat per chunk (O(n^2), and unbounded for a
                // tab that is never focused). Keep only the newest output - the terminal keeps
                // just its scrollback anyway. PTY chunks start on UTF-8 boundaries, so dropping
                // whole chunks from the front can't split a character.
                this.initialDataBuffer.push(data)
                this.initialDataBufferLength += data.length
                while (this.initialDataBufferLength > MAX_INITIAL_DATA_BUFFER && this.initialDataBuffer.length > 1) {
                    this.initialDataBufferLength -= this.initialDataBuffer.shift()!.length
                    this.initialDataBufferTruncated = true
                }
            } else {
                this.output.next(data.toString())
                this.binaryOutput.next(data)
            }
        })

        this.middleware.outputToSession$.subscribe(data => this.write(data))
    }

    feedFromTerminal (data: Buffer): void {
        this.middleware.feedFromTerminal(data)
    }

    protected emitOutput (data: Buffer): void {
        this.middleware.feedFromSession(data)
    }

    releaseInitialDataBuffer (): void {
        if (this.initialDataBufferReleased) {
            return
        }
        this.initialDataBufferReleased = true
        if (this.initialDataBufferTruncated) {
            this.logger.warn(`Output buffered before the terminal was shown exceeded ${MAX_INITIAL_DATA_BUFFER} bytes; older output was dropped`)
        }
        const data = Buffer.concat([
            ...this.initialDataBufferTruncated ? [Buffer.from('\x1b[0m[... earlier output dropped ...]\r\n')] : [],
            ...this.initialDataBuffer,
        ])
        this.initialDataBuffer = []
        this.initialDataBufferLength = 0
        this.output.next(data.toString())
        this.binaryOutput.next(data)
    }

    setLoginScriptsOptions (options: LoginScriptsOptions): void {
        const newProcessor = new LoginScriptProcessor(this.logger, options)
        if (this.loginScriptProcessor) {
            this.middleware.replace(this.loginScriptProcessor, newProcessor)
        } else {
            this.middleware.push(newProcessor)
        }
        this.loginScriptProcessor = newProcessor
    }

    async destroy (): Promise<void> {
        if (this.open) {
            this.logger.info('Destroying')
            this.open = false
            this.closed.next()
            this.destroyed.next()
            await this.gracefullyKillProcess()
        }
        this.middleware.close()
        this.closed.complete()
        this.destroyed.complete()
        this.output.complete()
        this.binaryOutput.complete()
    }

    abstract start (options: unknown): Promise<void>
    abstract resize (columns: number, rows: number): void
    abstract write (data: Buffer): void
    abstract kill (signal?: string): void
    abstract gracefullyKillProcess (): Promise<void>
    abstract supportsWorkingDirectory (): boolean
    abstract getWorkingDirectory (): Promise<string|null>
}
