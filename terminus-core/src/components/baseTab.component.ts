import { Observable, Subject } from 'rxjs'
import { ViewRef } from '@angular/core'

/**
 * Represents an active "process" inside a tab,
 * for example, a user process running inside a terminal tab
 */
export interface BaseTabProcess {
    name: string
}

/**
 * Abstract base class for custom tab components
 */
export abstract class BaseTabComponent {
    /**
     * Current tab title
     */
    title: string

    /**
     * User-defined title override
     */
    customTitle: string

    /**
     * Last tab activity state
     */
    hasActivity = false

    /**
     * ViewRef to the tab DOM element
     */
    hostView: ViewRef

    /**
     * CSS color override for the tab's header
     */
    color: string|null = null

    protected hasFocus = false

    /**
     * Ping this if your recovery state has been changed and you want
     * your tab state to be saved sooner
     */
    protected recoveryStateChangedHint = new Subject<void>()

    private progressClearTimeout: number
    private titleChange = new Subject<string>()
    private focused = new Subject<void>()
    private blurred = new Subject<void>()
    private progress = new Subject<number|null>()
    private activity = new Subject<boolean>()
    private destroyed = new Subject<void>()

    get focused$ (): Observable<void> { return this.focused }
    get blurred$ (): Observable<void> { return this.blurred }
    get titleChange$ (): Observable<string> { return this.titleChange }
    get progress$ (): Observable<number|null> { return this.progress }
    get activity$ (): Observable<boolean> { return this.activity }
    get destroyed$ (): Observable<void> { return this.destroyed }
    get recoveryStateChangedHint$ (): Observable<void> { return this.recoveryStateChangedHint }

    constructor () {
        this.focused$.subscribe(() => {
            this.hasFocus = true
        })
        this.blurred$.subscribe(() => {
            this.hasFocus = false
        })
    }

    setTitle (title: string) {
        this.title = title
        if (!this.customTitle) {
            this.titleChange.next(title)
        }
    }

    /**
     * Sets visual progressbar on the tab
     *
     * @param  {type} progress: value between 0 and 1, or `null` to remove
     */
    setProgress (progress: number|null) {
        this.progress.next(progress)
        if (progress) {
            if (this.progressClearTimeout) {
                clearTimeout(this.progressClearTimeout)
            }
            this.progressClearTimeout = setTimeout(() => {
                this.setProgress(null)
            }, 5000) as any
        }
    }

    /**
     * Shows the acticity marker on the tab header
     */
    displayActivity (): void {
        this.hasActivity = true
        this.activity.next(true)
    }

    /**
     * Removes the acticity marker from the tab header
     */
    clearActivity (): void {
        this.hasActivity = false
        this.activity.next(false)
    }

    /**
     * Override this and implement a [[TabRecoveryProvider]] to enable recovery
     * for your custom tab
     *
     * @return JSON serializable tab state representation
     *         for your [[TabRecoveryProvider]] to parse
     */
    async getRecoveryToken (): Promise<any> {
        return null
    }

    /**
     * Override this to enable task completion notifications for the tab
     */
    async getCurrentProcess (): Promise<BaseTabProcess|null> {
        return null
    }

    /**
     * Return false to prevent the tab from being closed
     */
    async canClose (): Promise<boolean> {
        return true
    }

    emitFocused () {
        this.focused.next()
    }

    emitBlurred () {
        this.blurred.next()
    }

    /**
     * Called before the tab is closed
     */
    destroy (skipDestroyedEvent = false): void {
        this.focused.complete()
        this.blurred.complete()
        this.titleChange.complete()
        this.progress.complete()
        this.recoveryStateChangedHint.complete()
        if (!skipDestroyedEvent) {
            this.destroyed.next()
        }
        this.destroyed.complete()
    }
}
