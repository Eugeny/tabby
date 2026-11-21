import { Observable, Subject } from 'rxjs'
import { RecoveryToken } from './tabRecovery'

/**
 * A tab handed over by another window
 */
export interface TabTransferRequest {
    token: RecoveryToken

    /**
     * Where the tab has been dropped, in screen coordinates
     */
    screenX?: number
    screenY?: number

    /**
     * Reports back to the sending window whether the tab has been taken over
     */
    respond: (accepted: boolean) => void
}

/**
 * The tab being dragged, as shown once the cursor leaves the window
 */
export interface TabDragPreview {
    /** Where the tab is drawn, relative to the window */
    rect: { x: number, y: number, width: number, height: number }
    /** Where the tab has been grabbed, relative to `rect` */
    grabX: number
    grabY: number
    title: string
    fontFamily: string
    fontSize: string
    background: string
    foreground: string
    /** The tab's color, if it has one */
    accent: string|null
    /** Whether dropping the tab where there's no window moves this window instead of opening a new one */
    movesWindow: boolean
    /** What dropping the tab does, depending on where */
    labels: {
        newWindow: string
        moveWindow: string
        moveToWindow: string
    }
}

/**
 * A tab being dragged over this window from another one
 */
export interface TabDragOver {
    screenX: number
    screenY: number
    title: string
}

export abstract class HostWindowService {

    /**
     * Fired once the window is visible
     */
    get windowShown$ (): Observable<void> { return this.windowShown }

    /**
     * Fired when the window close button is pressed
     */
    get windowCloseRequest$ (): Observable<void> { return this.windowCloseRequest }
    get windowMoved$ (): Observable<void> { return this.windowMoved }
    get windowFocused$ (): Observable<void> { return this.windowFocused }

    /**
     * Fired when another window hands a tab over to this one
     */
    get tabTransferRequest$ (): Observable<TabTransferRequest> { return this.tabTransferRequest }

    /**
     * Fired while another window drags a tab over this one, and with `null` once it has left
     */
    get tabDragOver$ (): Observable<TabDragOver|null> { return this.tabDragOver }

    protected windowShown = new Subject<void>()
    protected windowCloseRequest = new Subject<void>()
    protected windowMoved = new Subject<void>()
    protected windowFocused = new Subject<void>()
    protected tabTransferRequest = new Subject<TabTransferRequest>()
    protected tabDragOver = new Subject<TabDragOver|null>()

    abstract readonly isFullscreen: boolean
    abstract reload (): void
    abstract setTitle (title?: string): void
    abstract toggleFullscreen (): void
    abstract minimize (): void
    abstract isMaximized (): boolean
    abstract toggleMaximize (): void
    abstract close (): void

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    openDevTools (): void { }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    bringToFront (): void { }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    flashFrame (): void { }

    /**
     * Whether tabs can be dragged out of this window into other windows
     */
    supportsTabTransfer (): boolean {
        return false
    }

    /**
     * Finds another app window at the given screen coordinates
     *
     * @returns an opaque window ID for [[sendTab]] or `null` if there's none
     */
    async findWindowAt (screenX: number, screenY: number): Promise<number|null> { // eslint-disable-line @typescript-eslint/no-unused-vars
        return null
    }

    /**
     * Hands a tab over to another window
     *
     * @param targetWindow  ID returned by [[findWindowAt]], or `null` to open a new window at the given screen coordinates
     * @param grabX  where the drag started, relative to this window
     * @returns whether the other window has taken the tab over
     */
    async sendTab (token: RecoveryToken, targetWindow: number|null, screenX: number, screenY: number, grabX: number, grabY: number): Promise<boolean> { // eslint-disable-line @typescript-eslint/no-unused-vars
        return false
    }

    /**
     * Moves the window so that the point grabbed at (`grabX`, `grabY`) ends up at the given screen coordinates
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    moveTo (screenX: number, screenY: number, grabX: number, grabY: number): void { }

    /**
     * Starts showing the dragged tab next to the cursor whenever it's outside of this window
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    startTabDragPreview (preview: TabDragPreview): void { }

    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    moveTabDragPreview (screenX: number, screenY: number): void { }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    endTabDragPreview (): void { }
}
