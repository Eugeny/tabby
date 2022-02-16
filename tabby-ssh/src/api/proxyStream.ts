import { Observable, Subject } from 'rxjs'
import { Duplex } from 'stream'

export class SSHProxyStreamSocket extends Duplex {
    constructor (private parent: SSHProxyStream) {
        super({
            allowHalfOpen: false,
        })
    }

    _read (size: number): void {
        this.parent.requestData(size)
    }

    _write (chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void): void {
        this.parent.consumeInput(chunk).then(() => callback(null), e => callback(e))
    }

    _destroy (error: Error|null, callback: (error: Error|null) => void): void {
        this.parent.handleStopRequest(error).then(() => callback(null), e => callback(e))
    }
}

export abstract class SSHProxyStream {
    get message$ (): Observable<string> { return this.message }
    get destroyed$ (): Observable<Error|null> { return this.destroyed }
    get socket (): SSHProxyStreamSocket|null { return this._socket }
    private message = new Subject<string>()
    private destroyed = new Subject<Error|null>()
    private _socket: SSHProxyStreamSocket|null = null

    async start (): Promise<SSHProxyStreamSocket> {
        if (!this._socket) {
            this._socket = new SSHProxyStreamSocket(this)
        }
        return this._socket
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    abstract requestData (size: number): void

    abstract consumeInput (data: Buffer): Promise<void>

    protected emitMessage (message: string): void {
        this.message.next(message)
    }

    protected emitOutput (data: Buffer): void {
        this._socket?.push(data)
    }

    async handleStopRequest (error: Error|null): Promise<void> {
        this.destroyed.next(error)
        this.destroyed.complete()
        this.message.complete()
    }

    stop (error?: Error): void {
        this._socket?.destroy(error)
    }
}
