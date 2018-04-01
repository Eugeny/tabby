import { Injectable, Inject, NgZone } from '@angular/core'
import { TouchBarSegmentedControl, SegmentedControlSegment } from 'electron'
import { Subject, Subscription } from 'rxjs'
import { AppService } from './app.service'
import { ConfigService } from './config.service'
import { ElectronService } from './electron.service'
import { BaseTabComponent } from '../components/baseTab.component'
import { IToolbarButton, ToolbarButtonProvider } from '../api'

@Injectable()
export class TouchbarService {
    tabSelected$ = new Subject<number>()
    private titleSubscriptions = new Map<BaseTabComponent, Subscription>()
    private tabsSegmentedControl: TouchBarSegmentedControl
    private tabSegments: SegmentedControlSegment[] = []

    constructor (
        private app: AppService,
        @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
        private config: ConfigService,
        private electron: ElectronService,
        private zone: NgZone,
    ) {
        app.tabsChanged$.subscribe(() => this.update())
        app.activeTabChange$.subscribe(() => this.update())
        app.tabOpened$.subscribe(tab => {
            let sub = tab.titleChange$.subscribe(title => {
                this.tabSegments[app.tabs.indexOf(tab)].label = this.shortenTitle(title)
                this.tabsSegmentedControl.segments = this.tabSegments
            })
            this.titleSubscriptions.set(tab, sub)
        })
        app.tabClosed$.subscribe(tab => {
            this.titleSubscriptions.get(tab).unsubscribe()
            this.titleSubscriptions.delete(tab)
        })
    }

    update () {
        let buttons: IToolbarButton[] = []
        this.config.enabledServices(this.toolbarButtonProviders).forEach(provider => {
            buttons = buttons.concat(provider.provide())
        })
        buttons.sort((a, b) => (a.weight || 0) - (b.weight || 0))
        this.tabSegments = this.app.tabs.map(tab => ({
            label: this.shortenTitle(tab.title),
        }))
        this.tabsSegmentedControl = new this.electron.TouchBar.TouchBarSegmentedControl({
            segments: this.tabSegments,
            selectedIndex: this.app.tabs.indexOf(this.app.activeTab),
            change: (selectedIndex) => this.zone.run(() => {
                this.app.selectTab(this.app.tabs[selectedIndex])
            })
        })
        let touchBar = new this.electron.TouchBar({
            items: [
                this.tabsSegmentedControl,
                new this.electron.TouchBar.TouchBarSpacer({size: 'flexible'}),
                new this.electron.TouchBar.TouchBarSpacer({size: 'small'}),
                ...buttons.map(button => new this.electron.TouchBar.TouchBarButton({
                    label: this.shortenTitle(button.touchBarTitle || button.title),
                        // backgroundColor: '#0022cc',
                    click: () => this.zone.run(() => button.click()),
                }))
            ]
        })
        this.electron.app.window.setTouchBar(touchBar)
    }

    private shortenTitle (title: string): string {
        if (title.length > 15) {
            title = title.substring(0, 15) + '...'
        }
        return title
    }
}
