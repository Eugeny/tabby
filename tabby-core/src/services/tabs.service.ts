import { Injectable, ComponentFactoryResolver, Injector } from '@angular/core'
import { BaseTabComponent } from '../components/baseTab.component'
import { TabRecoveryService } from './tabRecovery.service'

// eslint-disable-next-line @typescript-eslint/no-type-alias
export interface TabComponentType<T extends BaseTabComponent> {
    // eslint-disable-next-line @typescript-eslint/prefer-function-type
    new (...args: any[]): T
}

export interface NewTabParameters<T extends BaseTabComponent> {
    /**
     * Component type to be instantiated
     */
    type: TabComponentType<T>

    /**
     * Component instance inputs
     */
    inputs?: Record<string, any>
}

@Injectable({ providedIn: 'root' })
export class TabsService {
    /** @hidden */
    private constructor (
        private componentFactoryResolver: ComponentFactoryResolver,
        private injector: Injector,
        private tabRecovery: TabRecoveryService,
    ) { }

    /**
     * Instantiates a tab component and assigns given inputs
     */
    create <T extends BaseTabComponent> (params: NewTabParameters<T>): T {
        const componentFactory = this.componentFactoryResolver.resolveComponentFactory(params.type)
        const componentRef = componentFactory.create(this.injector)
        const tab = componentRef.instance
        tab.hostView = componentRef.hostView
        Object.assign(tab, params.inputs ?? {})
        return tab
    }

    /**
     * Duplicates an existing tab instance (using the tab recovery system)
     */
    async duplicate (tab: BaseTabComponent): Promise<BaseTabComponent|null> {
        const token = await this.tabRecovery.getFullRecoveryToken(tab)
        if (!token) {
            return null
        }
        const dup = await this.tabRecovery.recoverTab(token, true)
        if (dup) {
            return this.create(dup)
        }
        return null
    }
}
