/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, TranslateService, ConfigService, PlatformService, ProfilesService, MenuItemOptions, RECENT_PROFILES_HISTORY_SIZE } from 'tabby-core'
import { TerminalService } from './services/terminal.service'

type NewTabButtonAction = 'none' | 'default' | 'recent'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private terminal: TerminalService,
        private translate: TranslateService,
        private config: ConfigService,
        private platform: PlatformService,
        private profiles: ProfilesService,
    ) {
        super()
    }

    provide (): ToolbarButton[] {
        return [
            {
                icon: require('./icons/plus.svg'),
                title: this.translate.instant('New terminal'),
                touchBarNSImage: 'NSTouchBarAddDetailTemplate',
                click: () => {
                    this.runAction(this.config.store.terminal.newTabButtonLeftClick)
                },
                contextMenu: () => {
                    this.runAction(this.config.store.terminal.newTabButtonRightClick)
                },
            },
        ]
    }

    private runAction (action: NewTabButtonAction): void {
        if (action === 'recent') {
            this.showRecentProfilesMenu()
        } else if (action === 'default') {
            this.openDefaultProfile()
        }
    }

    private async openDefaultProfile (): Promise<void> {
        await this.terminal.openTab()
        this.profiles.addRecentProfile(await this.terminal.getDefaultProfile())
    }

    private async showRecentProfilesMenu (): Promise<void> {
        const recentProfiles = this.profiles.getRecentProfiles(RECENT_PROFILES_HISTORY_SIZE)
        if (!recentProfiles.length) {
            this.openDefaultProfile()
            return
        }
        const allProfiles = await this.profiles.getProfiles()
        const menu: MenuItemOptions[] = recentProfiles.map(recent => {
            const profile = allProfiles.find(x => x.id === recent.id) ?? recent
            const type = this.profiles.providerForProfile(profile)?.name
            return {
                label: type ? `${profile.name}  (${type})` : profile.name,
                click: () => this.profiles.launchProfile(profile),
            }
        })
        menu.push(
            { type: 'separator' },
            {
                label: this.translate.instant('Default profile'),
                click: () => this.openDefaultProfile(),
            },
            {
                label: this.translate.instant('All profiles…'),
                click: async () => {
                    const profile = await this.profiles.showProfileSelector().catch(() => null)
                    if (profile) {
                        this.profiles.launchProfile(profile)
                    }
                },
            },
        )
        this.platform.popupContextMenu(menu)
    }
}
