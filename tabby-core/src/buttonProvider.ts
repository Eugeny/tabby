/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'

import { ToolbarButton, ToolbarButtonProvider } from './api/toolbarButtonProvider'
import { HostAppService, Platform } from './api/hostApp'
import { Profile } from './api/profileProvider'
import { ConfigService } from './services/config.service'
import { HotkeysService } from './services/hotkeys.service'
import { ProfilesService } from './services/profiles.service'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private hostApp: HostAppService,
        private profilesService: ProfilesService,
        private config: ConfigService,
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
            this.launchProfile(profile)
        }
    }

    async launchProfile (profile: Profile) {
        await this.profilesService.openNewTabForProfile(profile)

        let recentProfiles = this.config.store.recentProfiles
        recentProfiles = recentProfiles.filter(x => x.group !== profile.group || x.name !== profile.name)
        recentProfiles.unshift(profile)
        if (recentProfiles.length > 5) {
            recentProfiles.pop()
        }
        this.config.store.recentProfiles = recentProfiles
        this.config.save()
    }

    provide (): ToolbarButton[] {
        return [{
            icon: this.hostApp.platform === Platform.Web
                ? require('./icons/plus.svg')
                : require('./icons/profiles.svg'),
            title: 'New tab with profile',
            click: () => this.activate(),
        }]
    }
}
