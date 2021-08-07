import { ipcRenderer, NativeImage } from 'electron'
import { Injectable, NgZone } from '@angular/core'
import { AppService, HostAppService, Platform } from 'tabby-core'
import { ElectronService } from '../services/electron.service'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class TouchbarService {
    private activityIcon: NativeImage

    private constructor (
        private app: AppService,
        private hostApp: HostAppService,
        private electron: ElectronService,
        private zone: NgZone,
    ) {
        if (this.hostApp.platform !== Platform.macOS) {
            return
        }
        app.tabsChanged$.subscribe(() => this.update())
        app.activeTabChange$.subscribe(() => this.update())

        const activityIconPath = `${electron.app.getAppPath()}/assets/activity.png`
        this.activityIcon = this.electron.nativeImage.createFromPath(activityIconPath)

        app.tabOpened$.subscribe(tab => {
            tab.titleChange$.subscribe(() => this.update())
            tab.activity$.subscribe(() => this.update())
        })

        ipcRenderer.on('touchbar-selection', (_event, index) => this.zone.run(() => {
            this.app.selectTab(this.app.tabs[index])
        }))
    }

    update (): void {
        if (this.hostApp.platform !== Platform.macOS) {
            return
        }

        const tabSegments = this.app.tabs.map(tab => ({
            label: this.shortenTitle(tab.title),
            icon: this.app.activeTab !== tab && tab.hasActivity ? this.activityIcon : undefined,
        }))

        ipcRenderer.send('window-set-touch-bar', tabSegments, this.app.activeTab ? this.app.tabs.indexOf(this.app.activeTab) : undefined)
    }

    private shortenTitle (title: string): string {
        if (title.length > 15) {
            title = title.substring(0, 15) + '...'
        }
        return title
    }
}
