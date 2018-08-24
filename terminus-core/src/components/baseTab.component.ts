import { Observable, Subject } from 'rxjs'
import { ViewRef } from '@angular/core'

export abstract class BaseTabComponent {
    private static lastTabID = 0
    id: number
    title: string
    customTitle: string
    hasActivity = false
    hasFocus = false
    hostView: ViewRef
    protected titleChange = new Subject<string>()
    protected focused = new Subject<void>()
    protected blurred = new Subject<void>()
    protected progress = new Subject<number>()

    get focused$ (): Observable<void> { return this.focused }
    get blurred$ (): Observable<void> { return this.blurred }
    get titleChange$ (): Observable<string> { return this.titleChange }
    get progress$ (): Observable<number> { return this.progress }

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
    }

    displayActivity (): void {
        this.hasActivity = true
    }

    getRecoveryToken (): any {
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
    }
}
