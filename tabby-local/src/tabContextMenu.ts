import { Inject, Injectable, Optional } from '@angular/core'
import { ConfigService, BaseTabComponent, TabContextMenuItemProvider, MenuItemOptions, ProfilesService, TranslateService } from 'tabby-core'
import { TerminalTabComponent } from './components/terminalTab.component'
import { TerminalService } from './services/terminal.service'
import { LocalProfile, UACService } from './api'

/** @hidden */
@Injectable()
export class NewTabContextMenu extends TabContextMenuItemProvider {
    weight = 10

    constructor (
        public config: ConfigService,
        private profilesService: ProfilesService,
        private terminalService: TerminalService,
        @Optional() @Inject(UACService) private uac: UACService|undefined,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent, tabHeader?: boolean): Promise<MenuItemOptions[]> {
        const profiles = (await this.profilesService.getProfiles()).filter(x => x.type === 'local') as LocalProfile[]

        const items: MenuItemOptions[] = [
            {
                label: this.translate.instant('New terminal'),
                click: () => {
                    if (tab instanceof TerminalTabComponent) {
                        this.profilesService.openNewTabForProfile(tab.profile)
                    } else {
                        this.terminalService.openTab()
                    }
                },
            },
            {
                label: this.translate.instant('New with profile'),
                submenu: profiles.map(profile => ({
                    label: profile.name,
                    click: async () => {
                        let workingDirectory = profile.options.cwd
                        if (!workingDirectory && tab instanceof TerminalTabComponent) {
                            workingDirectory = await tab.session?.getWorkingDirectory() ?? undefined
                        }
                        await this.terminalService.openTab(profile, workingDirectory)
                    },
                })),
            },
        ]

        if (this.uac?.isAvailable) {
            items.push({
                label: this.translate.instant('New admin tab'),
                submenu: profiles.map(profile => ({
                    label: profile.name,
                    click: () => {
                        this.profilesService.openNewTabForProfile({
                            ...profile,
                            options: {
                                ...profile.options,
                                runAsAdministrator: true,
                            },
                        })
                    },
                })),
            })
        }

        if (tab instanceof TerminalTabComponent && tabHeader && this.uac?.isAvailable) {
            const terminalTab = tab
            items.push({
                label: this.translate.instant('Duplicate as administrator'),
                click: () => {
                    this.profilesService.openNewTabForProfile({
                        ...terminalTab.profile,
                        options: {
                            ...terminalTab.profile.options,
                            runAsAdministrator: true,
                        },
                    })
                },
            })
        }

        return items
    }
}
