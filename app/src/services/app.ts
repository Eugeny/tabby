import { Subject } from 'rxjs'
import { Injectable, ComponentFactoryResolver, Injector, Optional } from '@angular/core'
import { Logger, LogService } from 'services/log'
import { DefaultTabProvider } from 'api/defaultTabProvider'
import { BaseTabComponent } from 'components/baseTab'

export declare type TabComponentType = new (...args: any[]) => BaseTabComponent


@Injectable()
export class AppService {
    tabs: BaseTabComponent[] = []
    activeTab: BaseTabComponent
    lastTabIndex = 0
    logger: Logger
    tabsChanged$ = new Subject()

    constructor (
        private componentFactoryResolver: ComponentFactoryResolver,
        @Optional() private defaultTabProvider: DefaultTabProvider,
        private injector: Injector,
        log: LogService,
    ) {
        this.logger = log.create('app')
    }

    openNewTab (type: TabComponentType, inputs?: any): BaseTabComponent {
        let componentFactory = this.componentFactoryResolver.resolveComponentFactory(type)
        let componentRef = componentFactory.create(this.injector)
        componentRef.instance.hostView = componentRef.hostView
        Object.assign(componentRef.instance, inputs || {})

        this.tabs.push(componentRef.instance)
        this.selectTab(componentRef.instance)
        this.tabsChanged$.next()

        return componentRef.instance
    }

    openDefaultTab (): void {
        if (this.defaultTabProvider) {
            this.defaultTabProvider.openNewTab()
        }
    }

    selectTab (tab: BaseTabComponent) {
        if (this.tabs.includes(this.activeTab)) {
            this.lastTabIndex = this.tabs.indexOf(this.activeTab)
        } else {
            this.lastTabIndex = null
        }
        if (this.activeTab) {
            this.activeTab.hasActivity = false
            this.activeTab.blurred.emit()
        }
        this.activeTab = tab
        if (this.activeTab) {
            this.activeTab.focused.emit()
        }
    }

    toggleLastTab () {
        if (!this.lastTabIndex || this.lastTabIndex >= this.tabs.length) {
            this.lastTabIndex = 0
        }
        this.selectTab(this.tabs[this.lastTabIndex])
    }

    nextTab () {
        let tabIndex = this.tabs.indexOf(this.activeTab)
        if (tabIndex < this.tabs.length - 1) {
            this.selectTab(this.tabs[tabIndex + 1])
        }
    }

    previousTab () {
        let tabIndex = this.tabs.indexOf(this.activeTab)
        if (tabIndex > 0) {
            this.selectTab(this.tabs[tabIndex - 1])
        }
    }

    closeTab (tab: BaseTabComponent) {
        tab.destroy()
        /* if (tab.session) {
            this.sessions.destroySession(tab.session)
        } */
        let newIndex = Math.max(0, this.tabs.indexOf(tab) - 1)
        this.tabs = this.tabs.filter((x) => x != tab)
        if (tab == this.activeTab) {
            this.selectTab(this.tabs[newIndex])
        }
        this.tabsChanged$.next()
    }
}
