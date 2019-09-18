import { NgZone, Injectable } from '@angular/core'
import { ElectronService, ConfigService, HostAppService, Platform } from 'terminus-core'
import { TerminalService } from './terminal.service'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class DockMenuService {
    appVersion: string

    private constructor (
        private electron: ElectronService,
        private config: ConfigService,
        private hostApp: HostAppService,
        private zone: NgZone,
        private terminalService: TerminalService,
    ) {
        config.changed$.subscribe(() => this.update())
    }

    update () {
        if (this.hostApp.platform === Platform.Windows) {
            this.electron.app.setJumpList(this.config.store.terminal.profiles.length ? [{
                type: 'custom',
                name: 'Profiles',
                items: this.config.store.terminal.profiles.map(profile => ({
                    type: 'task',
                    program: process.execPath,
                    args: `profile "${profile.name}"`,
                    title: profile.name,
                    iconPath: process.execPath,
                    iconIndex: 0,
                })),
            }] : null as any)
        }
        if (this.hostApp.platform === Platform.macOS) {
            this.electron.app.dock.setMenu(this.electron.Menu.buildFromTemplate(
                this.config.store.terminal.profiles.map(profile => ({
                    label: profile.name,
                    click: () => this.zone.run(() => {
                        this.terminalService.openTabWithOptions(profile.sessionOptions)
                    }),
                }))
            ))
        }
    }
}
