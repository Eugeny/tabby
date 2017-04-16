import { Subject, BehaviorSubject } from 'rxjs'
import { ViewRef } from '@angular/core'


export abstract class BaseTabComponent {
    id: number
    title$ = new BehaviorSubject<string>(null)
    scrollable: boolean
    hasActivity = false
    focused$ = new Subject<void>()
    blurred$ = new Subject<void>()
    hasFocus = false
    hostView: ViewRef
    private static lastTabID = 0

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
