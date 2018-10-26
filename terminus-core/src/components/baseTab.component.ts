import { Observable, Subject } from 'rxjs'
import { ViewRef } from '@angular/core'

export interface BaseTabProcess {
    name: string
}

export abstract class BaseTabComponent {
    private static lastTabID = 0
    id: number
    title: string
    customTitle: string
    hasFocus = false
    hasActivity = false
    hostView: ViewRef
    protected titleChange = new Subject<string>()
    protected focused = new Subject<void>()
    protected blurred = new Subject<void>()
    protected progress = new Subject<number>()
    protected activity = new Subject<boolean>()
    protected destroyed = new Subject<void>()

    private progressClearTimeout: number

    get focused$ (): Observable<void> { return this.focused }
    get blurred$ (): Observable<void> { return this.blurred }
    get titleChange$ (): Observable<string> { return this.titleChange }
    get progress$ (): Observable<number> { return this.progress }
    get activity$ (): Observable<boolean> { return this.activity }
    get destroyed$ (): Observable<void> { return this.destroyed }

    constructor () {
        this.id = BaseTabComponent.lastTabID++
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

    setProgress (progress: number) {
        this.progress.next(progress)
        if (progress) {
            if (this.progressClearTimeout) {
                clearTimeout(this.progressClearTimeout)
            }
            this.progressClearTimeout = setTimeout(() => {
                this.setProgress(null)
            }, 5000)
        }
    }

    displayActivity (): void {
        this.hasActivity = true
        this.activity.next(true)
    }

    clearActivity (): void {
        this.hasActivity = false
        this.activity.next(false)
    }

    getRecoveryToken (): any {
        return null
    }

    async getCurrentProcess (): Promise<BaseTabProcess> {
        return null
    }

    async canClose (): Promise<boolean> {
        return true
    }

    emitFocused () {
        this.focused.next()
    }

    emitBlurred () {
        this.blurred.next()
    }

    destroy (): void {
        this.focused.complete()
        this.blurred.complete()
        this.titleChange.complete()
        this.progress.complete()
        this.destroyed.next()
        this.destroyed.complete()
    }
}
