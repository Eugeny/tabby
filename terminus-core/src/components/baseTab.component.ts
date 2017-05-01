import { Subject, BehaviorSubject } from 'rxjs'
import { ViewRef } from '@angular/core'

export abstract class BaseTabComponent {
    private static lastTabID = 0
    id: number
    title$ = new BehaviorSubject<string>(null)
    scrollable: boolean
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

    displayActivity (): void {
        this.hasActivity = true
    }

    getRecoveryToken (): any {
        return null
    }

    destroy (): void {
        this.focused$.complete()
        this.blurred$.complete()
        this.title$.complete()
    }
}
