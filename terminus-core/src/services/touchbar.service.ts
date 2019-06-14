import { Injectable, Inject, NgZone } from '@angular/core'
import { TouchBarSegmentedControl, SegmentedControlSegment } from 'electron'
import { AppService } from './app.service'
import { ConfigService } from './config.service'
import { ElectronService } from './electron.service'
import { HostAppService, Platform } from './hostApp.service'
import { ToolbarButton, ToolbarButtonProvider } from '../api'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class TouchbarService {
    private tabsSegmentedControl: TouchBarSegmentedControl
    private buttonsSegmentedControl: TouchBarSegmentedControl
    private tabSegments: SegmentedControlSegment[] = []
    private nsImageCache: {[id: string]: Electron.NativeImage} = {}

    constructor (
        private app: AppService,
        private hostApp: HostAppService,
        @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
        private config: ConfigService,
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
                if (segment) {
                    segment.label = this.shortenTitle(title)
                    this.tabsSegmentedControl.segments = this.tabSegments
                }
            })
            tab.activity$.subscribe(hasActivity => {
                const showIcon = this.app.activeTab !== tab && hasActivity
                const segment = this.tabSegments[app.tabs.indexOf(tab)]
                if (segment) {
                    segment.icon = showIcon ? activityIcon : null
                }
            })
        })
    }

    updateTabs () {
        this.tabSegments = this.app.tabs.map(tab => ({
            label: this.shortenTitle(tab.title),
        }))
        this.tabsSegmentedControl.segments = this.tabSegments
        this.tabsSegmentedControl.selectedIndex = this.app.tabs.indexOf(this.app.activeTab)
    }

    update () {
        if (this.hostApp.platform !== Platform.macOS) {
            return
        }

        let buttons: ToolbarButton[] = []
        this.config.enabledServices(this.toolbarButtonProviders).forEach(provider => {
            buttons = buttons.concat(provider.provide())
        })
        buttons = buttons.filter(x => !!x.touchBarNSImage)
        buttons.sort((a, b) => (a.weight || 0) - (b.weight || 0))
        this.tabSegments = this.app.tabs.map(tab => ({
            label: this.shortenTitle(tab.title),
        }))

        this.tabsSegmentedControl = new this.electron.TouchBar.TouchBarSegmentedControl({
            segments: this.tabSegments,
            selectedIndex: this.app.tabs.indexOf(this.app.activeTab),
            change: (selectedIndex) => this.zone.run(() => {
                this.app.selectTab(this.app.tabs[selectedIndex])
            }),
        })

        this.buttonsSegmentedControl = new this.electron.TouchBar.TouchBarSegmentedControl({
            segments: buttons.map(button => this.getButton(button)),
            mode: 'buttons',
            change: (selectedIndex) => this.zone.run(() => {
                buttons[selectedIndex].click()
            }),
        })

        const touchBar = new this.electron.TouchBar({
            items: [
                this.tabsSegmentedControl,
                new this.electron.TouchBar.TouchBarSpacer({ size: 'flexible' }),
                new this.electron.TouchBar.TouchBarSpacer({ size: 'small' }),
                this.buttonsSegmentedControl,
            ],
        })
        this.hostApp.setTouchBar(touchBar)
    }

    private getButton (button: ToolbarButton): Electron.SegmentedControlSegment {
        return {
            label: button.touchBarNSImage ? null : this.shortenTitle(button.touchBarTitle || button.title),
            icon: button.touchBarNSImage ? this.getCachedNSImage(button.touchBarNSImage) : null,
            // click: () => this.zone.run(() => button.click()),
        }
    }

    private getCachedNSImage (name: string) {
        if (!this.nsImageCache[name]) {
            this.nsImageCache[name] = this.electron.nativeImage.createFromNamedImage(name, [0, 0, 1])
        }
        return this.nsImageCache[name]
    }

    private shortenTitle (title: string): string {
        if (title.length > 15) {
            title = title.substring(0, 15) + '...'
        }
        return title
    }
}
