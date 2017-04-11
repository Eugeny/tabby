import { BehaviorSubject } from 'rxjs'
import { EventEmitter, ViewRef } from '@angular/core'


export abstract class BaseTabComponent {
    id: number
    title$ = new BehaviorSubject<string>(null)
    scrollable: boolean
    hasActivity = false
    focused = new EventEmitter<any>()
    blurred = new EventEmitter<any>()
    hostView: ViewRef
    private static lastTabID = 0

    constructor () {
        this.id = BaseTabComponent.lastTabID++
    }

    displayActivity (): void {
        this.hasActivity = true
    }

    getRecoveryToken (): any {
        return null
    }

    destroy (): void {
    }
}
