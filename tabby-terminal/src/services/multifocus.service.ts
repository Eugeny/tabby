import { Injectable } from '@angular/core'
import { BaseTerminalTabComponent } from '../api/baseTerminalTab.component'
import { Subscription } from 'rxjs'
import { SplitTabComponent, TranslateService, AppService, HotkeysService } from 'tabby-core'

@Injectable({ providedIn: 'root' })
export class MultifocusService {
    private inputSubscription: Subscription|null = null
    private currentTab: BaseTerminalTabComponent<any>|null = null
    private warningElement: HTMLElement

    constructor (
        private app: AppService,
        hotkeys: HotkeysService,
        translate: TranslateService,
    ) {
        this.warningElement = document.createElement('div')
        this.warningElement.className = 'broadcast-status-warning'
        this.warningElement.innerText = translate.instant('Broadcast mode. Click anywhere to cancel.')
        this.warningElement.style.display = 'none'
        document.body.appendChild(this.warningElement)

        hotkeys.hotkey$.subscribe(hotkey => {
            switch (hotkey) {
                case 'focus-all-tabs':
                    this.focusAllTabs()
                    break
                case 'pane-focus-all':
                    this.focusAllPanes()
                    break
            }
        })
    }

    start (currentTab: BaseTerminalTabComponent<any>, tabs: BaseTerminalTabComponent<any>[]): void {
        if (this.inputSubscription) {
            return
        }

        if (currentTab.parent instanceof SplitTabComponent) {
            const parent = currentTab.parent
            parent._allFocusMode = true
            parent.layout()
        }

        this.currentTab = currentTab
        this.inputSubscription = currentTab.frontend?.input$.subscribe(data => {
            for (const tab of tabs) {
                if (tab !== currentTab) {
                    tab.sendInput(data)
                }
            }
        }) ?? null
    }

    cancel (): void {
        this.warningElement.style.display = 'none'
        document.querySelector('app-root')!['style'].border = 'none'

        if (!this.inputSubscription) {
            return
        }
        this.inputSubscription.unsubscribe()
        this.inputSubscription = null
        if (this.currentTab?.parent instanceof SplitTabComponent) {
            this.currentTab.parent._allFocusMode = false
            this.currentTab.parent.layout()
        }
        this.currentTab = null
    }

    focusAllTabs (): void {
        let currentTab = this.app.activeTab
        if (currentTab && currentTab instanceof SplitTabComponent) {
            currentTab = currentTab.getFocusedTab()
        }
        if (!currentTab || !(currentTab instanceof BaseTerminalTabComponent)) {
            return
        }
        const tabs = this.app.tabs
            .map((t => {
                if (t instanceof BaseTerminalTabComponent) {
                    return [t]
                } else if (t instanceof SplitTabComponent) {
                    return t.getAllTabs()
                        .filter(x => x instanceof BaseTerminalTabComponent)
                } else {
                    return []
                }
            }) as (_) => BaseTerminalTabComponent<any>[])
            .flat()
        this.start(currentTab, tabs)

        this.warningElement.style.display = 'block'
        document.querySelector('app-root')!['style'].border = '5px solid red'
    }

    focusAllPanes (): void {
        const currentTab = this.app.activeTab
        if (!currentTab || !(currentTab instanceof SplitTabComponent)) {
            return
        }

        const pane = currentTab.getFocusedTab()
        if (!pane || !(pane instanceof BaseTerminalTabComponent)) {
            return
        }
        const tabs = currentTab.getAllTabs().filter(t => t instanceof BaseTerminalTabComponent)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        this.start(pane, tabs as any)
    }
}
