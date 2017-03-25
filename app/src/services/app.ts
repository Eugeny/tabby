import { Inject, Injectable } from '@angular/core'
import { Logger, LogService } from 'services/log'
import { Tab } from 'api/tab'
import { TabRecoveryProvider } from 'api/tabRecovery'


@Injectable()
export class AppService {
    tabs: Tab[] = []
    activeTab: Tab
    lastTabIndex = 0
    logger: Logger

    constructor (
        @Inject(TabRecoveryProvider) private tabRecoveryProviders: TabRecoveryProvider[],
        log: LogService,
    ) {
        this.logger = log.create('app')
    }

    openTab (tab: Tab): void {
        this.tabs.push(tab)
        this.selectTab(tab)
        this.saveTabs()
    }

    selectTab (tab) {
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
        this.activeTab.focused.emit()
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

    closeTab (tab) {
        tab.destroy()
        /* if (tab.session) {
            this.sessions.destroySession(tab.session)
        } */
        let newIndex = Math.max(0, this.tabs.indexOf(tab) - 1)
        this.tabs = this.tabs.filter((x) => x != tab)
        if (tab == this.activeTab) {
            this.selectTab(this.tabs[newIndex])
        }
        this.saveTabs()
    }

    saveTabs () {
        window.localStorage.tabsRecovery = JSON.stringify(
            this.tabs
                .map((tab) => tab.getRecoveryToken())
                .filter((token) => !!token)
        )
    }

    async restoreTabs (): Promise<void> {
        if (window.localStorage.tabsRecovery) {
            for (let token of JSON.parse(window.localStorage.tabsRecovery)) {
                let tab: Tab
                for (let provider of this.tabRecoveryProviders) {
                    try {
                        tab = await provider.recover(token)
                        if (tab) {
                            break
                        }
                    } catch (error) {
                        this.logger.warn('Tab recovery crashed:', token, provider, error)
                    }
                }
                if (tab) {
                    this.openTab(tab)
                } else {
                    this.logger.warn('Cannot restore tab from the token:', token)
                }
            }
            this.saveTabs()
        }
    }
}
