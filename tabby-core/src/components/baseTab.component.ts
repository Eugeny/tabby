import { Observable, Subject, distinctUntilChanged, debounceTime } from 'rxjs'
import { EmbeddedViewRef, ViewContainerRef, ViewRef } from '@angular/core'
import { RecoveryToken } from '../api/tabRecovery'
import { BaseComponent } from './base.component'

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
export abstract class BaseTabComponent extends BaseComponent {
    /**
     * Parent tab (usually a SplitTabComponent)
     */
    parent: BaseTabComponent|null = null

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

    hasFocus = false

    /**
     * Ping this if your recovery state has been changed and you want
     * your tab state to be saved sooner
     */
    protected recoveryStateChangedHint = new Subject<void>()
    protected viewContainer?: ViewContainerRef

    /* @hidden */
    viewContainerEmbeddedRef?: EmbeddedViewRef<any>

    private progressClearTimeout: number
    private titleChange = new Subject<string>()
    private focused = new Subject<void>()
    private blurred = new Subject<void>()
    private progress = new Subject<number|null>()
    private activity = new Subject<boolean>()
    private destroyed = new Subject<void>()

    private _destroyCalled = false

    get focused$ (): Observable<void> { return this.focused }
    get blurred$ (): Observable<void> { return this.blurred }
    get titleChange$ (): Observable<string> { return this.titleChange.pipe(distinctUntilChanged()) }
    get progress$ (): Observable<number|null> { return this.progress.pipe(distinctUntilChanged()) }
    get activity$ (): Observable<boolean> { return this.activity.pipe(debounceTime(500)) }
    get destroyed$ (): Observable<void> { return this.destroyed }
    get recoveryStateChangedHint$ (): Observable<void> { return this.recoveryStateChangedHint }

    protected constructor () {
        super()
        this.focused$.subscribe(() => {
            this.hasFocus = true
        })
        this.blurred$.subscribe(() => {
            this.hasFocus = false
        })
    }

    setTitle (title: string): void {
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
    setProgress (progress: number|null): void {
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
    async getRecoveryToken (): Promise<RecoveryToken|null> {
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

    emitFocused (): void {
        this.focused.next()
    }

    emitBlurred (): void {
        this.blurred.next()
    }

    insertIntoContainer (container: ViewContainerRef): EmbeddedViewRef<any> {
        this.viewContainerEmbeddedRef = container.insert(this.hostView) as EmbeddedViewRef<any>
        this.viewContainer = container
        return this.viewContainerEmbeddedRef
    }

    removeFromContainer (): void {
        if (!this.viewContainer || !this.viewContainerEmbeddedRef) {
            return
        }
        this.viewContainer.detach(this.viewContainer.indexOf(this.viewContainerEmbeddedRef))
        this.viewContainerEmbeddedRef = undefined
        this.viewContainer = undefined
    }

    /**
     * Called before the tab is closed
     */
    destroy (skipDestroyedEvent = false): void {
        if (this._destroyCalled) {
            return
        }
        this._destroyCalled = true
        this.focused.complete()
        this.blurred.complete()
        this.titleChange.complete()
        this.progress.complete()
        this.activity.complete()
        this.recoveryStateChangedHint.complete()
        if (!skipDestroyedEvent) {
            this.destroyed.next()
        }
        this.destroyed.complete()
        this.hostView.destroy()
    }

    /** @hidden */
    ngOnDestroy (): void {
        this.destroy()
        super.ngOnDestroy()
    }
}
