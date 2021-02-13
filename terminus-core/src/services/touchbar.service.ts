import { SegmentedControlSegment, TouchBarSegmentedControl } from 'electron'
import { Injectable, NgZone } from '@angular/core'
import { AppService } from './app.service'
import { ElectronService } from './electron.service'
import { HostAppService, Platform } from './hostApp.service'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class TouchbarService {
    private tabsSegmentedControl: TouchBarSegmentedControl
    private tabSegments: SegmentedControlSegment[] = []

    private constructor (
        private app: AppService,
        private hostApp: HostAppService,
        private electron: ElectronService,
        private zone: NgZone,
    ) {
        if (this.hostApp.platform !== Platform.macOS) {
            return
        }
        app.tabsChanged$.subscribe(() => this.updateTabs())
        app.activeTabChange$.subscribe(() => this.updateTabs())

        const activityIconPath = `${electron.app.getAppPath()}/assets/activity.png`
        const activityIcon = this.electron.nativeImage.createFromPath(activityIconPath)
        app.tabOpened$.subscribe(tab => {
            tab.titleChange$.subscribe(title => {
                const segment = this.tabSegments[app.tabs.indexOf(tab)]
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (segment) {
                    segment.label = this.shortenTitle(title)
                    this.tabsSegmentedControl.segments = this.tabSegments
                }
            })
            tab.activity$.subscribe(hasActivity => {
                const showIcon = this.app.activeTab !== tab && hasActivity
                const segment = this.tabSegments[app.tabs.indexOf(tab)]
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (segment) {
                    segment.icon = showIcon ? activityIcon : undefined
                }
            })
        })
    }

    updateTabs (): void {
        this.tabSegments = this.app.tabs.map(tab => ({
            label: this.shortenTitle(tab.title),
        }))
        this.tabsSegmentedControl.segments = this.tabSegments
        this.tabsSegmentedControl.selectedIndex = this.app.activeTab ? this.app.tabs.indexOf(this.app.activeTab) : 0
    }

    update (): void {
        if (this.hostApp.platform !== Platform.macOS) {
            return
        }

        this.tabsSegmentedControl = new this.electron.TouchBar.TouchBarSegmentedControl({
            segments: this.tabSegments,
            selectedIndex: this.app.activeTab ? this.app.tabs.indexOf(this.app.activeTab) : undefined,
            change: (selectedIndex) => this.zone.run(() => {
                this.app.selectTab(this.app.tabs[selectedIndex])
            }),
        })

        const touchBar = new this.electron.TouchBar({
            items: [
                this.tabsSegmentedControl,
            ],
        })
        this.hostApp.setTouchBar(touchBar)
    }

    private shortenTitle (title: string): string {
        if (title.length > 15) {
            title = title.substring(0, 15) + '...'
        }
        return title
    }
}
