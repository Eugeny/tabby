import { Injectable, Inject } from '@angular/core'
import { NewTabParameters } from './tabs.service'
import { BaseTabComponent } from '../components/baseTab.component'
import { Profile, ProfileProvider } from '../api/profileProvider'
import { AppService } from './app.service'
import { ConfigService } from './config.service'

@Injectable({ providedIn: 'root' })
export class ProfilesService {
    constructor (
        private app: AppService,
        private config: ConfigService,
        @Inject(ProfileProvider) private profileProviders: ProfileProvider[],
    ) { }

    async openNewTabForProfile (profile: Profile): Promise<BaseTabComponent|null> {
        const params = await this.newTabParametersForProfile(profile)
        if (params) {
            const tab = this.app.openNewTab(params)
            ;(this.app.getParentTab(tab) ?? tab).color = profile.color ?? null
            tab.setTitle(profile.name)
            if (profile.disableDynamicTitle) {
                tab['enableDynamicTitle'] = false
            }
            return tab
        }
        return null
    }

    async newTabParametersForProfile (profile: Profile): Promise<NewTabParameters<BaseTabComponent>|null> {
        return this.providerForProfile(profile)?.getNewTabParameters(profile) ?? null
    }

    getProviders (): ProfileProvider[] {
        return [...this.profileProviders]
    }

    async getProfiles (): Promise<Profile[]> {
        const lists = await Promise.all(this.config.enabledServices(this.profileProviders).map(x => x.getBuiltinProfiles()))
        let list = lists.reduce((a, b) => a.concat(b), [])
        list = [
            ...this.config.store.profiles ?? [],
            ...list,
        ]
        list.sort((a, b) => a.group?.localeCompare(b.group ?? '') ?? -1)
        list.sort((a, b) => a.name.localeCompare(b.name))
        list.sort((a, b) => (a.isBuiltin ? 1 : 0) - (b.isBuiltin ? 1 : 0))
        return list
    }

    providerForProfile (profile: Profile): ProfileProvider|null {
        return this.profileProviders.find(x => x.id === profile.type) ?? null
    }
}
