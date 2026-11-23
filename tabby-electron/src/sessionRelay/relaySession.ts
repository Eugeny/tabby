import { NgZone } from '@angular/core'
import { Subject, firstValueFrom, timeout } from 'rxjs'
import { Logger } from 'tabby-core'
import { BaseSession } from 'tabby-terminal'
import { RelayGuestMessage, RelayHostMessage } from './messages'

/**
 * A session that keeps running in another window and is relayed to this one
 *
 * @hidden
 */
export class RelaySession extends BaseSession {
    private paused = new Subject<void>()
    private detached = false

    constructor (logger: Logger, private port: MessagePort, private zone: NgZone) {
        super(logger)
    }

    async start (): Promise<void> {
        this.open = true
        this.port.onmessage = event => this.handleMessage(event.data)
    }

    resize (columns: number, rows: number): void {
        this.post({ type: 'resize', columns, rows })
    }

    write (data: Buffer): void {
        this.post({ type: 'input', data: new Uint8Array(data) })
    }

    kill (): void {
        this.post({ type: 'close' })
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

    /**
     * Has the other window hold back output.
     * Resolves once everything sent before has arrived.
     */
    async pauseOutput (): Promise<void> {
        const paused = firstValueFrom(this.paused.pipe(timeout(2000))).catch(() => null)
        this.post({ type: 'pause' })
        await paused
    }

    resumeOutput (): void {
        this.post({ type: 'resume' })
    }

    /**
     * Stops talking to the other window without closing the session there
     */
    detach (): void {
        this.open = false
        this.detached = true
        this.port.onmessage = null
        this.port.close()
    }

    async destroy (): Promise<void> {
        await super.destroy()
        this.port.close()
    }

    private handleMessage (message: RelayHostMessage) {
        switch (message.type) {
            case 'output':
                this.emitOutput(Buffer.from(message.data))
                break
            case 'paused':
                this.paused.next()
                break
            case 'closed':
                this.zone.run(() => this.destroy())
                break
        }
    }

    private post (message: RelayGuestMessage) {
        if (!this.detached) {
            this.port.postMessage(message)
        }
    }
}
