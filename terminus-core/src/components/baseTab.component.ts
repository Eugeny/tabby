import { Subject } from 'rxjs'
import { ViewRef } from '@angular/core'

export abstract class BaseTabComponent {
    private static lastTabID = 0
    id: number
    title: string
    titleChange$ = new Subject<string>()
    customTitle: string
    hasActivity = false
    focused$ = new Subject<void>()
    blurred$ = new Subject<void>()
    hasFocus = false
    hostView: ViewRef

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
            this.titleChange$.next(title)
        }
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

    destroy (): void {
        this.focused$.complete()
        this.blurred$.complete()
    }
}
