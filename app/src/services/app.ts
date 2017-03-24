import { EventEmitter, Injectable } from '@angular/core'
import { Tab } from 'models/tab'


@Injectable()
export class AppService {
    tabs: Tab[] = []
    activeTab: Tab
    lastTabIndex = 0

    constructor () {

    }

    openTab (tab: Tab): void {
        this.tabs.push(tab)
        this.selectTab(tab)
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
    }
}
