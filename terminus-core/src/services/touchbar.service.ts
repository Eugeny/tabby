import { Injectable, Inject, NgZone } from '@angular/core'
import { TouchBarSegmentedControl, SegmentedControlSegment } from 'electron'
import { AppService } from './app.service'
import { ConfigService } from './config.service'
import { ElectronService } from './electron.service'
import { HostAppService } from './hostApp.service'
import { IToolbarButton, ToolbarButtonProvider } from '../api'

@Injectable()
export class TouchbarService {
    private tabsSegmentedControl: TouchBarSegmentedControl
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
        app.tabsChanged$.subscribe(() => this.update())
        app.activeTabChange$.subscribe(() => this.update())
        app.tabOpened$.subscribe(tab => {
            tab.titleChange$.subscribe(title => {
                this.tabSegments[app.tabs.indexOf(tab)].label = this.shortenTitle(title)
                this.tabsSegmentedControl.segments = this.tabSegments
            })
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
                ...buttons.map(button => this.getButton(button))
            ]
        })
        this.hostApp.setTouchBar(touchBar)
    }

    private getButton (button: IToolbarButton): Electron.TouchBarButton {
        return new this.electron.TouchBar.TouchBarButton({
            label: button.touchBarNSImage ? null : this.shortenTitle(button.touchBarTitle || button.title),
            icon: button.touchBarNSImage ? this.getCachedNSImage(button.touchBarNSImage) : null,
            click: () => this.zone.run(() => button.click()),
        })
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
