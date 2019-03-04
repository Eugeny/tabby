import { Observable, Subject, AsyncSubject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { Injectable } from '@angular/core'
import { BaseTabComponent } from '../components/baseTab.component'
import { SplitTabComponent } from '../components/splitTab.component'
import { Logger, LogService } from './log.service'
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
        this.interval = setInterval(() => this.tick(), 1000)
        this.tab.destroyed$.pipe(takeUntil(this.destroyed$)).subscribe(() => this.stop())
    }

    async tick () {
        if (!(await this.tab.getCurrentProcess())) {
            this.done.next(null)
            this.stop()
        }
    }

    stop () {
        clearInterval(this.interval)
        this.destroyed.next(null)
        this.destroyed.complete()
        this.done.complete()
    }
}

@Injectable({ providedIn: 'root' })
export class AppService {
    tabs: BaseTabComponent[] = []
    activeTab: BaseTabComponent
    lastTabIndex = 0
    logger: Logger

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
    get ready$ (): Observable<void> { return this.ready }

    constructor (
        private config: ConfigService,
        private hostApp: HostAppService,
        private tabRecovery: TabRecoveryService,
        private tabsService: TabsService,
        log: LogService,
    ) {
        this.logger = log.create('app')

        this.hostApp.windowCloseRequest$.subscribe(() => this.closeWindow())

        this.tabRecovery.recoverTabs().then(tabs => {
            for (let tab of tabs) {
                this.openNewTabRaw(tab.type, tab.options)
            }

            this.tabsChanged$.subscribe(() => {
                tabRecovery.saveTabs(this.tabs)
            })
            setInterval(() => {
                tabRecovery.saveTabs(this.tabs)
            }, 30000)
        })
    }

    addTabRaw (tab: BaseTabComponent) {
        this.tabs.push(tab)
        this.selectTab(tab)
        this.tabsChanged.next()
        this.tabOpened.next(tab)

        tab.recoveryStateChangedHint$.subscribe(() => {
            this.tabRecovery.saveTabs(this.tabs)
        })

        tab.titleChange$.subscribe(title => {
            if (tab === this.activeTab) {
                this.hostApp.setTitle(title)
            }
        })

        tab.destroyed$.subscribe(() => {
            let newIndex = Math.max(0, this.tabs.indexOf(tab) - 1)
            this.tabs = this.tabs.filter((x) => x !== tab)
            if (tab === this.activeTab) {
                this.selectTab(this.tabs[newIndex])
            }
            this.tabsChanged.next()
            this.tabClosed.next(tab)
        })
    }

    openNewTabRaw (type: TabComponentType, inputs?: any): BaseTabComponent {
        let tab = this.tabsService.create(type, inputs)
        this.addTabRaw(tab)
        return tab
    }

    openNewTab (type: TabComponentType, inputs?: any): BaseTabComponent {
        let splitTab = this.tabsService.create(SplitTabComponent) as SplitTabComponent
        let tab = this.tabsService.create(type, inputs)
        splitTab.insert(tab, null, 'r')
        this.addTabRaw(splitTab)
        return tab
    }

    selectTab (tab: BaseTabComponent) {
        if (this.activeTab === tab) {
            this.activeTab.emitFocused()
            return
        }
        if (this.tabs.includes(this.activeTab)) {
            this.lastTabIndex = this.tabs.indexOf(this.activeTab)
        } else {
            this.lastTabIndex = null
        }
        if (this.activeTab) {
            this.activeTab.clearActivity()
            this.activeTab.emitBlurred()
        }
        this.activeTab = tab
        this.activeTabChange.next(tab)
        if (this.activeTab) {
            setImmediate(() => {
                this.activeTab.emitFocused()
            })
            this.hostApp.setTitle(this.activeTab.title)
        }
    }

    toggleLastTab () {
        if (!this.lastTabIndex || this.lastTabIndex >= this.tabs.length) {
            this.lastTabIndex = 0
        }
        this.selectTab(this.tabs[this.lastTabIndex])
    }

    nextTab () {
        if (this.tabs.length > 1) {
            let tabIndex = this.tabs.indexOf(this.activeTab)
            if (tabIndex < this.tabs.length - 1) {
                this.selectTab(this.tabs[tabIndex + 1])
            } else if (this.config.store.appearance.cycleTabs) {
                this.selectTab(this.tabs[0])
            }
        }
    }

    previousTab () {
        if (this.tabs.length > 1) {
            let tabIndex = this.tabs.indexOf(this.activeTab)
            if (tabIndex > 0) {
                this.selectTab(this.tabs[tabIndex - 1])
            } else if (this.config.store.appearance.cycleTabs) {
                this.selectTab(this.tabs[this.tabs.length - 1])
            }
        }
    }

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
        let dup = await this.tabsService.duplicate(tab)
        if (dup) {
            this.addTabRaw(dup)
        }
    }

    async closeWindow () {
        for (let tab of this.tabs) {
            if (!await tab.canClose()) {
                return
            }
        }
        for (let tab of this.tabs) {
            tab.destroy()
        }
        this.hostApp.closeWindow()
    }

    emitReady () {
        this.ready.next(null)
        this.ready.complete()
        this.hostApp.emitReady()
    }

    observeTabCompletion (tab: BaseTabComponent): Observable<void> {
        if (!this.completionObservers.has(tab)) {
            let observer = new CompletionObserver(tab)
            observer.destroyed$.subscribe(() => {
                this.stopObservingTabCompletion(tab)
            })
            this.completionObservers.set(tab, observer)
        }
        return this.completionObservers.get(tab).done$
    }

    stopObservingTabCompletion (tab: BaseTabComponent) {
        this.completionObservers.delete(tab)
    }
}
