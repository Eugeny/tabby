import { Injector, NgZone } from '@angular/core'
import { Observable, Subject } from 'rxjs'
import { Frontend } from 'tabby-terminal'
import { RelayGuestMessage, RelayHostMessage } from './messages'

/** Output kept while no guest window is listening */
const MAX_PENDING_OUTPUT = 8 * 1024 * 1024

/**
 * Stands in for the terminal frontend of a tab whose session keeps running in
 * this window while the tab is displayed in another one: output is forwarded
 * to that window, and its keyboard input and size come back from there.
 *
 * @hidden
 */
export class RelayFrontend extends Frontend {
    private port: MessagePort|null = null
    private paused = false
    private pendingOutput: string[] = []
    private pendingOutputLength = 0
    private closeRequested = new Subject<void>()

    /** Fired when the user closes the tab in the other window */
    get closeRequested$ (): Observable<void> { return this.closeRequested }

    constructor (injector: Injector, private zone: NgZone) {
        super(injector)
    }

    /**
     * Starts talking to a (new) guest window
     */
    connect (port: MessagePort): void {
        this.port?.close()
        this.port = port
        this.paused = false
        port.onmessage = event => this.handleMessage(event.data)
        this.flushPendingOutput()
    }

    /**
     * Returns and forgets the output that hasn't reached any guest window
     */
    takePendingOutput (): string {
        const output = this.pendingOutput.join('')
        this.pendingOutput = []
        this.pendingOutputLength = 0
        return output
    }

    async write (data: string): Promise<void> {
        if (this.port && !this.paused) {
            this.post({ type: 'output', data })
            return
        }
        this.pendingOutput.push(data)
        this.pendingOutputLength += data.length
        while (this.pendingOutputLength > MAX_PENDING_OUTPUT && this.pendingOutput.length > 1) {
            this.pendingOutputLength -= this.pendingOutput.shift()!.length
        }
    }

    destroy (): void {
        this.post({ type: 'closed' })
        this.port?.close()
        this.port = null
        this.closeRequested.complete()
        super.destroy()
    }

    async attach (): Promise<void> { } // eslint-disable-line @typescript-eslint/no-empty-function
    getSelection (): string { return '' }
    copySelection (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    selectAll (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    clearSelection (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    focus (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    clear (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    visualBell (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    scrollToTop (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    scrollLines (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    scrollPages (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    scrollToBottom (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    configure (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    setZoom (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    findNext (): { resultCount: number } { return { resultCount: 0 } }
    findPrevious (): { resultCount: number } { return { resultCount: 0 } }
    cancelSearch (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    saveState (): any { return null }
    restoreState (): void { } // eslint-disable-line @typescript-eslint/no-empty-function
    supportsBracketedPaste (): boolean { return false }
    isAlternateScreenActive (): boolean { return false }

    private handleMessage (message: RelayGuestMessage) {
        switch (message.type) {
            case 'input':
                this.input.next(Buffer.from(message.data))
                break
            case 'resize':
                this.resize.next({ columns: message.columns, rows: message.rows })
                break
            case 'pause':
                this.paused = true
                this.post({ type: 'paused' })
                break
            case 'resume':
                this.paused = false
                this.flushPendingOutput()
                break
            case 'close':
                this.zone.run(() => this.closeRequested.next())
                break
        }
    }

    private flushPendingOutput () {
        const output = this.takePendingOutput()
        if (output) {
            this.post({ type: 'output', data: output })
        }
    }

    private post (message: RelayHostMessage) {
        this.port?.postMessage(message)
    }
}
