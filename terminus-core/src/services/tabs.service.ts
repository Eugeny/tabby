import { Injectable, ComponentFactoryResolver, Injector } from '@angular/core'
import { BaseTabComponent } from '../components/baseTab.component'
import { TabRecoveryService } from './tabRecovery.service'

export declare type TabComponentType = new (...args: any[]) => BaseTabComponent

@Injectable({ providedIn: 'root' })
export class TabsService {
    /** @hidden */
    constructor (
        private componentFactoryResolver: ComponentFactoryResolver,
        private injector: Injector,
        private tabRecovery: TabRecoveryService,
    ) { }

    /**
     * Instantiates a tab component and assigns given inputs
     */
    create (type: TabComponentType, inputs?: any): BaseTabComponent {
        let componentFactory = this.componentFactoryResolver.resolveComponentFactory(type)
        let componentRef = componentFactory.create(this.injector)
        let tab = componentRef.instance
        tab.hostView = componentRef.hostView
        Object.assign(tab, inputs || {})
        return tab
    }

    /**
     * Duplicates an existing tab instance (using the tab recovery system)
     */
    async duplicate (tab: BaseTabComponent): Promise<BaseTabComponent> {
        let token = await tab.getRecoveryToken()
        if (!token) {
            return null
        }
        let dup = await this.tabRecovery.recoverTab(token)
        if (dup) {
            return this.create(dup.type, dup.options)
        }
        return null
    }
}
