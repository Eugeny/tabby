import { Injectable, NgZone, Injector } from '@angular/core'
import { isWindowsBuild, WIN_BUILD_FLUENT_BG_SUPPORTED, HostAppService, Platform, CLIHandler } from 'tabby-core'
import { ElectronService } from '../services/electron.service'


@Injectable({ providedIn: 'root' })
export class ElectronHostAppService extends HostAppService {
    get platform (): Platform {
        return this.configPlatform
    }

    get configPlatform (): Platform {
        return {
            win32: Platform.Windows,
            darwin: Platform.macOS,
            linux: Platform.Linux,
        }[process.platform]
    }

    constructor (
        private zone: NgZone,
        private electron: ElectronService,
        injector: Injector,
    ) {
        super(injector)

        electron.ipcRenderer.on('host:preferences-menu', () => this.zone.run(() => this.settingsUIRequest.next()))

        electron.ipcRenderer.on('cli', (_$event, argv: any, cwd: string, secondInstance: boolean) => this.zone.run(async () => {
            const event = { argv, cwd, secondInstance }
            this.logger.info('CLI arguments received:', event)

            const cliHandlers = injector.get(CLIHandler) as unknown as CLIHandler[]
            cliHandlers.sort((a, b) => b.priority - a.priority)

            let handled = false
            for (const handler of cliHandlers) {
                if (handled && handler.firstMatchOnly) {
                    continue
                }
                if (await handler.handle(event)) {
                    this.logger.info('CLI handler matched:', handler.constructor.name)
                    handled = true
                }
            }
        }))

        electron.ipcRenderer.on('host:config-change', () => this.zone.run(() => {
            this.configChangeBroadcast.next()
        }))

        if (isWindowsBuild(WIN_BUILD_FLUENT_BG_SUPPORTED)) {
            electron.ipcRenderer.send('window-set-disable-vibrancy-while-dragging', true)
        }
    }

    newWindow (): void {
        this.electron.ipcRenderer.send('app:new-window')
    }

    async saveConfig (data: string): Promise<void> {
        await this.electron.ipcRenderer.invoke('app:save-config', data)
    }

    emitReady (): void {
        this.electron.ipcRenderer.send('app:ready')
    }

    relaunch (): void {
        const isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE
        if (isPortable) {
            this.electron.app.relaunch({ execPath: process.env.PORTABLE_EXECUTABLE_FILE })
        } else {
            let args: string[] = []
            if (this.platform === Platform.Linux) {
                args = ['--no-sandbox']
            }
            this.electron.app.relaunch({ args })
        }
        this.electron.app.exit()
    }

    quit (): void {
        this.logger.info('Quitting')
        this.electron.app.quit()
    }
}
