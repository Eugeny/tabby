import { NgZone, Injectable } from '@angular/core'
import { ConfigService, HostAppService, Platform, ProfilesService } from 'tabby-core'
import { ElectronService } from 'tabby-electron'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class DockMenuService {
    appVersion: string

    private constructor (
        private electron: ElectronService,
        private config: ConfigService,
        private hostApp: HostAppService,
        private zone: NgZone,
        private profilesService: ProfilesService,
    ) {
        config.changed$.subscribe(() => this.update())
    }

    update (): void {
        if (this.hostApp.platform === Platform.Windows) {
            this.electron.app.setJumpList(this.config.store.profiles.length ? [{
                type: 'custom',
                name: 'Profiles',
                items: this.config.store.profiles.map(profile => ({
                    type: 'task',
                    program: process.execPath,
                    args: `profile "${profile.name}"`,
                    title: profile.name,
                    iconPath: process.execPath,
                    iconIndex: 0,
                })),
            }] : null)
        }
        if (this.hostApp.platform === Platform.macOS) {
            this.electron.app.dock.setMenu(this.electron.Menu.buildFromTemplate(
                this.config.store.profiles.map(profile => ({
                    label: profile.name,
                    click: () => this.zone.run(async () => {
                        this.profilesService.openNewTabForProfile(profile)
                    }),
                }))
            ))
        }
    }
}
