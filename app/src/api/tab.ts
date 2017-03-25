import { EventEmitter } from '@angular/core'
import { BaseTabComponent } from 'components/baseTab'

export declare type ComponentType<T extends Tab> = new (...args: any[]) => BaseTabComponent<T>

export class Tab {
    id: number
    title: string
    scrollable: boolean
    hasActivity = false
    focused = new EventEmitter<any>()
    blurred = new EventEmitter<any>()
    static lastTabID = 0

    constructor () {
        this.id = Tab.lastTabID++
    }

    displayActivity (): void {
        this.hasActivity = true
    }

    getComponentType (): ComponentType<Tab> {
        return null
    }

    getRecoveryToken (): any {
        return null
    }

    destroy (): void {
    }
}
