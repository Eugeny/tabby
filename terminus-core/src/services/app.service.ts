
import { Observable, Subject, AsyncSubject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { Injectable } from '@angular/core'

import { BaseTabComponent } from '../components/baseTab.component'
import { SplitTabComponent } from '../components/splitTab.component'

import { ConfigService } from './config.service'
import { HostAppService } from './hostApp.service'
import { TabRecoveryService } from './tabRecovery.service'
import { TabsService, TabComponentType } from './tabs.service'

class CompletionObserver {
    get done$ (): Observable<void> { return this.done }
    get destroyed$ (): Observable<void> { return this.destroyed }
    private done = new AsyncSubject<void>()
    private destroyed = new AsyncSubject<void>()
    private interval: number

    constructor (private tab: BaseTabComponent) {
        this.interval = setInterval(() => this.tick(), 1000) as any
        this.tab.destroyed$.pipe(takeUntil(this.destroyed$)).subscribe(() => this.stop())
    }

    async tick () {
        if (!await this.tab.getCurrentProcess()) {
            this.done.next()
            this.stop()
        }
    }

    stop () {
        clearInterval(this.interval)
        this.destroyed.next()
        this.destroyed.complete()
        this.done.complete()
    }
}

@Injectable({ providedIn: 'root' })
export class AppService {
    tabs: BaseTabComponent[] = []

    get activeTab (): BaseTabComponent { return this._activeTab }

    private lastTabIndex = 0
    private _activeTab: BaseTabComponent

    private activeTabChange = new Subject<BaseTabComponent>()
    private tabsChanged = new Subject<void>()
    private tabOpened = new Subject<BaseTabComponent>()
    private tabClosed = new Subject<BaseTabComponent>()
    private ready = new AsyncSubject<void>()

    private completionObservers = new Map<BaseTabComponent, CompletionObserver>()

    get activeTabChange$ (): Observable<BaseTabComponent> { return this.activeTabChange }
    get tabOpened$ (): Observable<BaseTabComponent> { return this.tabOpened }
    get tabsChanged$ (): Observable<void> { return this.tabsChanged }
    get tabClosed$ (): Observable<BaseTabComponent> { return this.tabClosed }

    /** Fires once when the app is ready */
    get ready$ (): Observable<void> { return this.ready }

    /** @hidden */
    constructor (
        private config: ConfigService,
        private hostApp: HostAppService,
        private tabRecovery: TabRecoveryService,
        private tabsService: TabsService,
    ) {
        if (hostApp.getWindow().id === 1) {
            if (config.store.terminal.recoverTabs) {
                this.tabRecovery.recoverTabs().then(tabs => {
                    for (const tab of tabs) {
                        this.openNewTabRaw(tab.type, tab.options)
                    }
                    this.startTabStorage()
                })
            } else {
                /** Continue to store the tabs even if the setting is currently off */
                this.startTabStorage()
            }
        }

        hostApp.windowFocused$.subscribe(() => {
            this._activeTab?.emitFocused()
        })
    }

    startTabStorage () {
        this.tabsChanged$.subscribe(() => {
            this.tabRecovery.saveTabs(this.tabs)
        })
        setInterval(() => {
            this.tabRecovery.saveTabs(this.tabs)
        }, 30000)
    }

    addTabRaw (tab: BaseTabComponent) {
        this.tabs.push(tab)
        this.selectTab(tab)
        this.tabsChanged.next()
        this.tabOpened.next(tab)

        if (this.hostApp.getWindow().id === 1) {
            tab.recoveryStateChangedHint$.subscribe(() => {
                this.tabRecovery.saveTabs(this.tabs)
            })
        }

        tab.titleChange$.subscribe(title => {
            if (tab === this._activeTab) {
                this.hostApp.setTitle(title)
            }
        })

        tab.destroyed$.subscribe(() => {
            const newIndex = Math.max(0, this.tabs.indexOf(tab) - 1)
            this.tabs = this.tabs.filter((x) => x !== tab)
            if (tab === this._activeTab) {
                this.selectTab(this.tabs[newIndex])
            }
            this.tabsChanged.next()
            this.tabClosed.next(tab)
        })
    }

    /**
     * Adds a new tab **without** wrapping it in a SplitTabComponent
     * @param inputs  Properties to be assigned on the new tab component instance
     */
    openNewTabRaw (type: TabComponentType, inputs?: any): BaseTabComponent {
        const tab = this.tabsService.create(type, inputs)
        this.addTabRaw(tab)
        return tab
    }

    /**
     * Adds a new tab while wrapping it in a SplitTabComponent
     * @param inputs  Properties to be assigned on the new tab component instance
     */
    openNewTab (type: TabComponentType, inputs?: any): BaseTabComponent {
        const splitTab = this.tabsService.create(SplitTabComponent) as SplitTabComponent
        const tab = this.tabsService.create(type, inputs)
        splitTab.addTab(tab, null, 'r')
        this.addTabRaw(splitTab)
        return tab
    }

    selectTab (tab: BaseTabComponent) {
        if (this._activeTab === tab) {
            this._activeTab.emitFocused()
            return
        }
        if (this.tabs.includes(this._activeTab)) {
            this.lastTabIndex = this.tabs.indexOf(this._activeTab)
        } else {
            this.lastTabIndex = 0
        }
        if (this._activeTab) {
            this._activeTab.clearActivity()
            this._activeTab.emitBlurred()
        }
        this._activeTab = tab
        this.activeTabChange.next(tab)
        if (this._activeTab) {
            setImmediate(() => {
                this._activeTab.emitFocused()
            })
            this.hostApp.setTitle(this._activeTab.title)
        }
    }

    getParentTab (tab: BaseTabComponent): SplitTabComponent|null {
        for (const topLevelTab of this.tabs) {
            if (topLevelTab instanceof SplitTabComponent) {
                if (topLevelTab.getAllTabs().includes(tab)) {
                    return topLevelTab
                }
            }
        }
        return null
    }

    /** Switches between the current tab and the previously active one */
    toggleLastTab () {
        if (!this.lastTabIndex || this.lastTabIndex >= this.tabs.length) {
            this.lastTabIndex = 0
        }
        this.selectTab(this.tabs[this.lastTabIndex])
    }

    nextTab () {
        if (this.tabs.length > 1) {
            const tabIndex = this.tabs.indexOf(this._activeTab)
            if (tabIndex < this.tabs.length - 1) {
                this.selectTab(this.tabs[tabIndex + 1])
            } else if (this.config.store.appearance.cycleTabs) {
                this.selectTab(this.tabs[0])
            }
        }
    }

    previousTab () {
        if (this.tabs.length > 1) {
            const tabIndex = this.tabs.indexOf(this._activeTab)
            if (tabIndex > 0) {
                this.selectTab(this.tabs[tabIndex - 1])
            } else if (this.config.store.appearance.cycleTabs) {
                this.selectTab(this.tabs[this.tabs.length - 1])
            }
        }
    }

    /** @hidden */
    emitTabsChanged () {
        this.tabsChanged.next()
    }

    async closeTab (tab: BaseTabComponent, checkCanClose?: boolean): Promise<void> {
        if (!this.tabs.includes(tab)) {
            return
        }
        if (checkCanClose && !await tab.canClose()) {
            return
        }
        tab.destroy()
    }

    async duplicateTab (tab: BaseTabComponent) {
        const dup = await this.tabsService.duplicate(tab)
        if (dup) {
            this.addTabRaw(dup)
        }
    }

    /**
     * Attempts to close all tabs, returns false if one of the tabs blocked closure
     */
    async closeAllTabs (): Promise<boolean> {
        for (const tab of this.tabs) {
            if (!await tab.canClose()) {
                return false
            }
        }
        for (const tab of this.tabs) {
            tab.destroy(true)
        }
        return true
    }

    /** @hidden */
    emitReady () {
        this.ready.next()
        this.ready.complete()
        this.hostApp.emitReady()
    }

    /**
     * Returns an observable that fires once
     * the tab's internal "process" (see [[BaseTabProcess]]) completes
     */
    observeTabCompletion (tab: BaseTabComponent): Observable<void> {
        if (!this.completionObservers.has(tab)) {
            const observer = new CompletionObserver(tab)
            observer.destroyed$.subscribe(() => {
                this.stopObservingTabCompletion(tab)
            })
            this.completionObservers.set(tab, observer)
        }
        return this.completionObservers.get(tab)!.done$
    }

    stopObservingTabCompletion (tab: BaseTabComponent) {
        this.completionObservers.delete(tab)
    }
}
