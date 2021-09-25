import { NgModule } from '@angular/core'
import { PlatformService, LogService, UpdaterService, DockingService, HostAppService, ThemesService, Platform, AppService, ConfigService, WIN_BUILD_FLUENT_BG_SUPPORTED, isWindowsBuild, HostWindowService, HotkeyProvider, ConfigProvider, FileProvider } from 'tabby-core'
import { TerminalColorSchemeProvider } from 'tabby-terminal'
import { SFTPContextMenuItemProvider } from 'tabby-ssh'

import { HyperColorSchemes } from './colorSchemes'
import { ElectronPlatformService } from './services/platform.service'
import { ElectronLogService } from './services/log.service'
import { ElectronUpdaterService } from './services/updater.service'
import { TouchbarService } from './services/touchbar.service'
import { ElectronDockingService } from './services/docking.service'
import { ElectronHostWindow } from './services/hostWindow.service'
import { ElectronFileProvider } from './services/fileProvider.service'
import { ElectronHostAppService } from './services/hostApp.service'
import { ElectronService } from './services/electron.service'
import { ElectronHotkeyProvider } from './hotkeys'
import { ElectronConfigProvider } from './config'
import { EditSFTPContextMenu } from './sftpContextMenu'

@NgModule({
    providers: [
        { provide: TerminalColorSchemeProvider, useClass: HyperColorSchemes, multi: true },
        { provide: PlatformService, useExisting: ElectronPlatformService },
        { provide: HostWindowService, useExisting: ElectronHostWindow },
        { provide: HostAppService, useExisting: ElectronHostAppService },
        { provide: LogService, useClass: ElectronLogService },
        { provide: UpdaterService, useClass: ElectronUpdaterService },
        { provide: DockingService, useClass: ElectronDockingService },
        { provide: HotkeyProvider, useClass: ElectronHotkeyProvider, multi: true },
        { provide: ConfigProvider, useClass: ElectronConfigProvider, multi: true },
        { provide: FileProvider, useClass: ElectronFileProvider, multi: true },
        { provide: SFTPContextMenuItemProvider, useClass: EditSFTPContextMenu, multi: true },
    ],
})
export default class ElectronModule {
    constructor (
        private config: ConfigService,
        private hostApp: ElectronHostAppService,
        private electron: ElectronService,
        private hostWindow: ElectronHostWindow,
        touchbar: TouchbarService,
        docking: DockingService,
        themeService: ThemesService,
        app: AppService,
    ) {
        config.ready$.toPromise().then(() => {
            touchbar.update()
            docking.dock()
            hostWindow.windowShown$.subscribe(() => {
                docking.dock()
            })
            this.registerGlobalHotkey()
            this.updateVibrancy()
        })

        config.changed$.subscribe(() => {
            this.registerGlobalHotkey()
        })

        themeService.themeChanged$.subscribe(theme => {
            if (hostApp.platform === Platform.macOS) {
                hostWindow.setTrafficLightPosition(
                    theme.macOSWindowButtonsInsetX ?? 14,
                    theme.macOSWindowButtonsInsetY ?? 11,
                )
            }
        })

        let lastProgress: number|null = null
        app.tabOpened$.subscribe(tab => {
            tab.progress$.subscribe(progress => {
                if (lastProgress === progress) {
                    return
                }
                if (progress !== null) {
                    hostWindow.setProgressBar(progress / 100.0)
                } else {
                    hostWindow.setProgressBar(-1)
                }
                lastProgress = progress
            })
        })

        config.changed$.subscribe(() => this.updateVibrancy())
    }

    private registerGlobalHotkey () {
        let value = this.config.store.hotkeys['toggle-window'] || []
        if (typeof value === 'string') {
            value = [value]
        }
        const specs: string[] = []
        value.forEach((item: string | string[]) => {
            item = typeof item === 'string' ? [item] : item

            try {
                let electronKeySpec = item[0]
                electronKeySpec = electronKeySpec.replaceAll('Meta', 'Super')
                electronKeySpec = electronKeySpec.replaceAll('⌘', 'Command')
                electronKeySpec = electronKeySpec.replaceAll('⌥', 'Alt')
                electronKeySpec = electronKeySpec.replaceAll('-', '+')
                specs.push(electronKeySpec)
            } catch (err) {
                console.error('Could not register the global hotkey:', err)
            }
        })

        this.electron.ipcRenderer.send('app:register-global-hotkey', specs)
    }

    private updateVibrancy () {
        let vibrancyType = this.config.store.appearance.vibrancyType
        if (this.hostApp.platform === Platform.Windows && !isWindowsBuild(WIN_BUILD_FLUENT_BG_SUPPORTED)) {
            vibrancyType = null
        }
        document.body.classList.toggle('vibrant', this.config.store.appearance.vibrancy)
        this.electron.ipcRenderer.send('window-set-vibrancy', this.config.store.appearance.vibrancy, vibrancyType)

        this.hostWindow.setOpacity(this.config.store.appearance.opacity)
    }
}

export { ElectronHostWindow, ElectronHostAppService, ElectronService }
