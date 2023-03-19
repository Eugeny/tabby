import { NgZone, Injectable } from '@angular/core'
import { ConfigService, HostAppService, Platform, ProfilesService, TranslateService } from 'tabby-core'
import { ElectronService } from './electron.service'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class DockMenuService {
    appVersion: string

    private constructor (
        config: ConfigService,
        private electron: ElectronService,
        private hostApp: HostAppService,
        private zone: NgZone,
        private profilesService: ProfilesService,
        private translate: TranslateService,
    ) {
        config.changed$.subscribe(() => this.update())
    }

    async update (): Promise<void> {
        const profiles = await this.profilesService.getProfiles()

        if (this.hostApp.platform === Platform.Windows) {
            this.electron.app.setJumpList([
                {
                    type: 'custom',
                    name: this.translate.instant('Recent'),
                    items: this.profilesService.getRecentProfiles().map((profile, index) => ({
                        type: 'task',
                        program: process.execPath,
                        args: `recent ${index}`,
                        title: profile.name,
                        iconPath: process.execPath,
                        iconIndex: 0,
                    })),
                },
                {
                    type: 'custom',
                    name: this.translate.instant('Profiles'),
                    items: profiles.map(profile => ({
                        type: 'task',
                        program: process.execPath,
                        args: `profile "${profile.name}"`,
                        title: profile.name,
                        iconPath: process.execPath,
                        iconIndex: 0,
                    })),
                },
            ])
        }
        if (this.hostApp.platform === Platform.macOS) {
            this.electron.app.dock.setMenu(this.electron.Menu.buildFromTemplate(
                [
                    ...[...this.profilesService.getRecentProfiles(), ...profiles].map(profile => ({
                        label: profile.name,
                        click: () => this.zone.run(async () => {
                            this.profilesService.openNewTabForProfile(profile)
                        }),
                    })),
                    {
                        label: this.translate.instant('New Window'),
                        click: () => this.zone.run(() => this.hostApp.newWindow()),
                    },
                ],
            ))
        }
    }
}
