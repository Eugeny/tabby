/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'

import { ToolbarButton, ToolbarButtonProvider } from './api/toolbarButtonProvider'
import { HostAppService, Platform } from './api/hostApp'
import { HotkeysService } from './services/hotkeys.service'
import { ProfilesService } from './services/profiles.service'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private hostApp: HostAppService,
        private profilesService: ProfilesService,
        private translate: TranslateService,
        hotkeys: HotkeysService,
    ) {
        super()
        hotkeys.hotkey$.subscribe(hotkey => {
            if (hotkey === 'profile-selector') {
                this.activate()
            }
        })
    }

    async activate () {
        const profile = await this.profilesService.showProfileSelector()
        if (profile) {
            this.profilesService.launchProfile(profile)
        }
    }

    provide (): ToolbarButton[] {
        return [
            {
                icon: this.hostApp.platform === Platform.Web
                    ? require('./icons/plus.svg')
                    : require('./icons/profiles.svg'),
                title: this.translate.instant('Profiles & connections'),
                click: () => this.activate(),
            },
            ...this.profilesService.getRecentProfiles().map(profile => ({
                icon: require('./icons/history.svg'),
                title: profile.name,
                showInToolbar: false,
                showinStartPage: true,
                click: async () => {
                    const p = (await this.profilesService.getProfiles()).find(x => x.id === profile.id) ?? profile
                    this.profilesService.launchProfile(p)
                },
            })),
        ]
    }
}
