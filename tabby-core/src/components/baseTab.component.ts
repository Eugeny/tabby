import { Observable, Subject, BehaviorSubject, distinctUntilChanged, filter, debounceTime } from 'rxjs'
import { EmbeddedViewRef, Injector, ViewContainerRef, ViewRef } from '@angular/core'
import { RecoveryToken } from '../api/tabRecovery'
import { BaseComponent } from './base.component'
import { ConfigService } from '../services/config.service'

/**
 * Represents an active "process" inside a tab,
 * for example, a user process running inside a terminal tab
 */
export interface BaseTabProcess {
    name: string
}

export interface GetRecoveryTokenOptions {
    includeState: boolean
}

/**
 * Abstract base class for custom tab components
 */
// @Component({ template: '' })
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
    get color (): string|null { return this._color }
    set color (value: string|null) { this._color = value }
    private _color: string|null = null

    /**
     * icon override for the tab's header
     */
    get icon (): string|null { return this._icon }
    set icon (value: string|null) { this._icon = value }
    private _icon: string|null = null

    hasFocus = false

    /**
     * Ping this if your recovery state has been changed and you want
     * your tab state to be saved sooner
     */
    protected recoveryStateChangedHint = new Subject<void>()
    protected viewContainer?: ViewContainerRef

    /* @hidden */
    viewContainerEmbeddedRef?: EmbeddedViewRef<any>

    private titleChange = new Subject<string>()
    private focused = new Subject<void>()
    private blurred = new Subject<void>()
    protected visibility = new BehaviorSubject<boolean>(false)
    protected progress = new BehaviorSubject<number|null>(null)
    protected activity = new BehaviorSubject<boolean>(false)
    private destroyed = new Subject<void>()

    private _destroyCalled = false

    get focused$ (): Observable<void> { return this.focused }
    get blurred$ (): Observable<void> { return this.blurred }
    /* @hidden */
    get visibility$ (): Observable<boolean> { return this.visibility }
    get titleChange$ (): Observable<string> { return this.titleChange.pipe(distinctUntilChanged()) }
    get progress$ (): Observable<number|null> { return this.progress.pipe(distinctUntilChanged()) }
    get activity$ (): Observable<boolean> { return this.activity }
    get destroyed$ (): Observable<void> { return this.destroyed }
    get recoveryStateChangedHint$ (): Observable<void> { return this.recoveryStateChangedHint }

    protected config: ConfigService

    protected constructor (injector: Injector) {
        super()
        this.config = injector.get(ConfigService)
        this.focused$.subscribe(() => {
            this.hasFocus = true
        })
        this.blurred$.subscribe(() => {
            this.hasFocus = false
        })
        this.subscribeUntilDestroyed(this.progress.pipe(
            filter(x => x !== null),
            debounceTime(5000),
        ), () => {
            this.setProgress(null)
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
    }

    /**
     * Shows the activity marker on the tab header
     */
    displayActivity (): void {
        if (!this.hasActivity) {
            this.hasActivity = true
            this.activity.next(true)
        }
    }

    /**
     * Removes the activity marker from the tab header
     */
    clearActivity (): void {
        if (this.hasActivity) {
            this.hasActivity = false
            this.activity.next(false)
        }
    }

    /**
     * Override this and implement a [[TabRecoveryProvider]] to enable recovery
     * for your custom tab
     *
     * @return JSON serializable tab state representation
     *         for your [[TabRecoveryProvider]] to parse
     */
    async getRecoveryToken (options?: GetRecoveryTokenOptions): Promise<RecoveryToken|null> { // eslint-disable-line @typescript-eslint/no-unused-vars
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

    /* @hidden */
    emitVisibility (visibility: boolean): void {
        this.visibility.next(visibility)
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
        const viewIndex = this.viewContainer.indexOf(this.viewContainerEmbeddedRef)
        if (viewIndex !== -1) {
            this.viewContainer.detach(viewIndex)
        }
        this.viewContainerEmbeddedRef = undefined
        this.viewContainer = undefined
    }

    get topmostParent (): BaseTabComponent|null {
        let parent = this.parent
        while (parent?.parent) {
            parent = parent.parent
        }
        return parent
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
    }

    /** @hidden */
    ngOnDestroy (): void {
        this.destroy()
        super.ngOnDestroy()
    }
}
