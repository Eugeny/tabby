import { NgZone, Injectable } from '@angular/core'
import { ElectronService, ConfigService, HostAppService, Platform } from 'terminus-core'
import { TerminalService } from './terminal.service'

@Injectable()
export class DockMenuService {
    appVersion: string

    constructor (
        private electron: ElectronService,
        private config: ConfigService,
        private hostApp: HostAppService,
        private zone: NgZone,
        private terminalService: TerminalService,
    ) {
        config.changed$.subscribe(() => this.update())
    }

    update () {
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
