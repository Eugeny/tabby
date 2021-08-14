import { Observable, Subject, AsyncSubject, takeUntil } from 'rxjs'
import { Injectable, Inject } from '@angular/core'

import { BaseTabComponent } from '../components/baseTab.component'
import { SplitTabComponent } from '../components/splitTab.component'
import { SelectorOption } from '../api/selector'
import { RecoveryToken } from '../api/tabRecovery'
import { BootstrapData, BOOTSTRAP_DATA } from '../api/mainProcess'
import { HostWindowService } from '../api/hostWindow'
import { HostAppService } from '../api/hostApp'

import { ConfigService } from './config.service'
import { TabRecoveryService } from './tabRecovery.service'
import { TabsService, NewTabParameters } from './tabs.service'
import { SelectorService } from './selector.service'

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

    get activeTab (): BaseTabComponent|null { return this._activeTab ?? null }

    private lastTabIndex = 0
    private _activeTab: BaseTabComponent | null = null
    private closedTabsStack: RecoveryToken[] = []

    private activeTabChange = new Subject<BaseTabComponent|null>()
    private tabsChanged = new Subject<void>()
    private tabOpened = new Subject<BaseTabComponent>()
    private tabRemoved = new Subject<BaseTabComponent>()
    private tabClosed = new Subject<BaseTabComponent>()
    private tabDragActive = new Subject<BaseTabComponent|null>()
    private ready = new AsyncSubject<void>()

    private completionObservers = new Map<BaseTabComponent, CompletionObserver>()

    get activeTabChange$ (): Observable<BaseTabComponent|null> { return this.activeTabChange }
    get tabOpened$ (): Observable<BaseTabComponent> { return this.tabOpened }
    get tabsChanged$ (): Observable<void> { return this.tabsChanged }
    get tabRemoved$ (): Observable<BaseTabComponent> { return this.tabRemoved }
    get tabClosed$ (): Observable<BaseTabComponent> { return this.tabClosed }
    get tabDragActive$ (): Observable<BaseTabComponent|null> { return this.tabDragActive }

    /** Fires once when the app is ready */
    get ready$ (): Observable<void> { return this.ready }

    /** @hidden */
    private constructor (
        private config: ConfigService,
        private hostApp: HostAppService,
        private hostWindow: HostWindowService,
        private tabRecovery: TabRecoveryService,
        private tabsService: TabsService,
        private selector: SelectorService,
        @Inject(BOOTSTRAP_DATA) private bootstrapData: BootstrapData,
    ) {
        this.tabsChanged$.subscribe(() => {
            this.tabRecovery.saveTabs(this.tabs)
        })
        setInterval(() => {
            this.tabRecovery.saveTabs(this.tabs)
        }, 30000)

        config.ready$.toPromise().then(async () => {
            if (this.bootstrapData.isFirstWindow) {
                if (config.store.recoverTabs) {
                    const tabs = await this.tabRecovery.recoverTabs()
                    for (const tab of tabs) {
                        this.openNewTabRaw(tab)
                    }
                }
                /** Continue to store the tabs even if the setting is currently off */
                this.tabRecovery.enabled = true
            }
        })

        hostWindow.windowFocused$.subscribe(() => this._activeTab?.emitFocused())

        this.tabClosed$.subscribe(async tab => {
            const token = await tabRecovery.getFullRecoveryToken(tab)
            if (token) {
                this.closedTabsStack.push(token)
            }
        })
    }

    addTabRaw (tab: BaseTabComponent, index: number|null = null): void {
        if (index !== null) {
            this.tabs.splice(index, 0, tab)
        } else {
            this.tabs.push(tab)
        }

        this.selectTab(tab)
        this.tabsChanged.next()
        this.tabOpened.next(tab)

        if (this.bootstrapData.isFirstWindow) {
            tab.recoveryStateChangedHint$.subscribe(() => {
                this.tabRecovery.saveTabs(this.tabs)
            })
        }

        tab.titleChange$.subscribe(title => {
            if (tab === this._activeTab) {
                this.hostWindow.setTitle(title)
            }
        })

        tab.destroyed$.subscribe(() => {
            this.removeTab(tab)
            this.tabRemoved.next(tab)
            this.tabClosed.next(tab)
        })

        if (tab instanceof SplitTabComponent) {
            tab.tabAdded$.subscribe(() => this.emitTabsChanged())
            tab.tabRemoved$.subscribe(() => this.emitTabsChanged())
            tab.tabAdopted$.subscribe(t => {
                this.removeTab(t)
                this.tabRemoved.next(t)
            })
        }
    }

    removeTab (tab: BaseTabComponent): void {
        const newIndex = Math.max(0, this.tabs.indexOf(tab) - 1)
        this.tabs = this.tabs.filter((x) => x !== tab)
        if (tab === this._activeTab) {
            this.selectTab(this.tabs[newIndex])
        }
        this.tabsChanged.next()
    }

    /**
     * Adds a new tab **without** wrapping it in a SplitTabComponent
     * @param inputs  Properties to be assigned on the new tab component instance
     */
    openNewTabRaw <T extends BaseTabComponent> (params: NewTabParameters<T>): T {
        const tab = this.tabsService.create(params)
        this.addTabRaw(tab)
        return tab
    }

    /**
     * Adds a new tab while wrapping it in a SplitTabComponent
     * @param inputs  Properties to be assigned on the new tab component instance
     */
    openNewTab <T extends BaseTabComponent> (params: NewTabParameters<T>): T {
        if (params.type as any === SplitTabComponent) {
            return this.openNewTabRaw(params)
        }
        const splitTab = this.tabsService.create({ type: SplitTabComponent })
        const tab = this.tabsService.create(params)
        splitTab.addTab(tab, null, 'r')
        this.addTabRaw(splitTab)
        return tab
    }

    async reopenLastTab (): Promise<BaseTabComponent|null> {
        const token = this.closedTabsStack.pop()
        if (token) {
            const recoveredTab = await this.tabRecovery.recoverTab(token)
            if (recoveredTab) {
                const tab = this.tabsService.create(recoveredTab)
                if (this.activeTab) {
                    this.addTabRaw(tab, this.tabs.indexOf(this.activeTab) + 1)
                } else {
                    this.addTabRaw(tab)
                }
                return tab
            }
        }
        return null
    }

    selectTab (tab: BaseTabComponent|null): void {
        if (tab && this._activeTab === tab) {
            this._activeTab.emitFocused()
            return
        }
        if (this._activeTab && this.tabs.includes(this._activeTab)) {
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
        setImmediate(() => {
            this._activeTab?.emitFocused()
        })
        this.hostWindow.setTitle(this._activeTab?.title)
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
    toggleLastTab (): void {
        if (!this.lastTabIndex || this.lastTabIndex >= this.tabs.length) {
            this.lastTabIndex = 0
        }
        this.selectTab(this.tabs[this.lastTabIndex])
    }

    nextTab (): void {
        if (!this._activeTab) {
            return
        }
        if (this.tabs.length > 1) {
            const tabIndex = this.tabs.indexOf(this._activeTab)
            if (tabIndex < this.tabs.length - 1) {
                this.selectTab(this.tabs[tabIndex + 1])
            } else if (this.config.store.appearance.cycleTabs) {
                this.selectTab(this.tabs[0])
            }
        }
    }

    previousTab (): void {
        if (!this._activeTab) {
            return
        }
        if (this.tabs.length > 1) {
            const tabIndex = this.tabs.indexOf(this._activeTab)
            if (tabIndex > 0) {
                this.selectTab(this.tabs[tabIndex - 1])
            } else if (this.config.store.appearance.cycleTabs) {
                this.selectTab(this.tabs[this.tabs.length - 1])
            }
        }
    }

    moveSelectedTabLeft (): void {
        if (!this._activeTab) {
            return
        }
        if (this.tabs.length > 1) {
            const tabIndex = this.tabs.indexOf(this._activeTab)
            if (tabIndex > 0) {
                this.swapTabs(this._activeTab, this.tabs[tabIndex - 1])
            } else if (this.config.store.appearance.cycleTabs) {
                this.tabs.push(this.tabs.shift()!)
            }
        }
    }

    moveSelectedTabRight (): void {
        if (!this._activeTab) {
            return
        }
        if (this.tabs.length > 1) {
            const tabIndex = this.tabs.indexOf(this._activeTab)
            if (tabIndex < this.tabs.length - 1) {
                this.swapTabs(this._activeTab, this.tabs[tabIndex + 1])
            } else if (this.config.store.appearance.cycleTabs) {
                this.tabs.unshift(this.tabs.pop()!)
            }
        }
    }

    swapTabs (a: BaseTabComponent, b: BaseTabComponent): void {
        const i1 = this.tabs.indexOf(a)
        const i2 = this.tabs.indexOf(b)
        this.tabs[i1] = b
        this.tabs[i2] = a
    }

    /** @hidden */
    emitTabsChanged (): void {
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

    async duplicateTab (tab: BaseTabComponent): Promise<BaseTabComponent|null> {
        const dup = await this.tabsService.duplicate(tab)
        if (dup) {
            this.addTabRaw(dup, this.tabs.indexOf(tab) + 1)
        }
        return dup
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

    async closeWindow (): Promise<void> {
        this.tabRecovery.enabled = false
        await this.tabRecovery.saveTabs(this.tabs)
        if (await this.closeAllTabs()) {
            this.hostWindow.close()
        } else {
            this.tabRecovery.enabled = true
        }
    }

    /** @hidden */
    emitReady (): void {
        this.ready.next()
        this.ready.complete()
        this.hostApp.emitReady()
    }

    /** @hidden */
    emitTabDragStarted (tab: BaseTabComponent): void {
        this.tabDragActive.next(tab)
    }

    /** @hidden */
    emitTabDragEnded (): void {
        this.tabDragActive.next(null)
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

    stopObservingTabCompletion (tab: BaseTabComponent): void {
        this.completionObservers.delete(tab)
    }

    // Deprecated
    showSelector <T> (name: string, options: SelectorOption<T>[]): Promise<T> {
        return this.selector.show(name, options)
    }
}
