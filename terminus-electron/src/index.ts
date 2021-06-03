import { NgModule } from '@angular/core'
import { PlatformService, LogService, UpdaterService, DockingService, HostAppService, ThemesService, Platform, AppService, ConfigService, ElectronService, WIN_BUILD_FLUENT_BG_SUPPORTED, isWindowsBuild, HostWindowService } from 'terminus-core'
import { TerminalColorSchemeProvider } from 'terminus-terminal'

import { HyperColorSchemes } from './colorSchemes'
import { ElectronPlatformService } from './services/platform.service'
import { ElectronLogService } from './services/log.service'
import { ElectronUpdaterService } from './services/updater.service'
import { TouchbarService } from './services/touchbar.service'
import { ElectronDockingService } from './services/docking.service'
import { ElectronHostWindow } from './services/hostWindow.service'

@NgModule({
    providers: [
        { provide: TerminalColorSchemeProvider, useClass: HyperColorSchemes, multi: true },
        { provide: PlatformService, useClass: ElectronPlatformService },
        { provide: HostWindowService, useClass: ElectronHostWindow },
        { provide: LogService, useClass: ElectronLogService },
        { provide: UpdaterService, useClass: ElectronUpdaterService },
        { provide: DockingService, useClass: ElectronDockingService },
    ],
})
export default class ElectronModule {
    constructor (
        private config: ConfigService,
        private hostApp: HostAppService,
        private electron: ElectronService,
        touchbar: TouchbarService,
        docking: DockingService,
        themeService: ThemesService,
        app: AppService
    ) {
        config.ready$.toPromise().then(() => {
            touchbar.update()
            docking.dock()
            hostApp.shown.subscribe(() => {
                docking.dock()
            })
            this.updateVibrancy()
        })

        themeService.themeChanged$.subscribe(theme => {
            if (hostApp.platform === Platform.macOS) {
                hostApp.getWindow().setTrafficLightPosition({
                    x: theme.macOSWindowButtonsInsetX ?? 14,
                    y: theme.macOSWindowButtonsInsetY ?? 11,
                })
            }
        })

        let lastProgress: number|null = null
        app.tabOpened$.subscribe(tab => {
            tab.progress$.subscribe(progress => {
                if (lastProgress === progress) {
                    return
                }
                if (progress !== null) {
                    hostApp.getWindow().setProgressBar(progress / 100.0, { mode: 'normal' })
                } else {
                    hostApp.getWindow().setProgressBar(-1, { mode: 'none' })
                }
                lastProgress = progress
            })
        })

        config.changed$.subscribe(() => this.updateVibrancy())
    }

    private updateVibrancy () {
        let vibrancyType = this.config.store.appearance.vibrancyType
        if (this.hostApp.platform === Platform.Windows && !isWindowsBuild(WIN_BUILD_FLUENT_BG_SUPPORTED)) {
            vibrancyType = null
        }
        document.body.classList.toggle('vibrant', this.config.store.appearance.vibrancy)
        this.electron.ipcRenderer.send('window-set-vibrancy', this.config.store.appearance.vibrancy, vibrancyType)

        this.hostApp.getWindow().setOpacity(this.config.store.appearance.opacity)
    }
}
