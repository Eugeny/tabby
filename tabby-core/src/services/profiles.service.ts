import { Injectable, Inject } from '@angular/core'
import { NewTabParameters } from './tabs.service'
import { BaseTabComponent } from '../components/baseTab.component'
import { Profile, ProfileProvider } from '../api/profileProvider'
import { SelectorOption } from '../api/selector'
import { AppService } from './app.service'
import { configMerge, ConfigProxy, ConfigService } from './config.service'
import { NotificationsService } from './notifications.service'
import { SelectorService } from './selector.service'

@Injectable({ providedIn: 'root' })
export class ProfilesService {
    private profileDefaults = {
        id: '',
        type: '',
        name: '',
        group: '',
        options: {},
        icon: '',
        color: '',
        disableDynamicTitle: false,
        weight: 0,
        isBuiltin: false,
        isTemplate: false,
    }

    constructor (
        private app: AppService,
        private config: ConfigService,
        private notifications: NotificationsService,
        private selector: SelectorService,
        @Inject(ProfileProvider) private profileProviders: ProfileProvider[],
    ) { }

    async openNewTabForProfile (profile: Profile): Promise<BaseTabComponent|null> {
        profile = this.getConfigProxyForProfile(profile)
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
        profile = this.getConfigProxyForProfile(profile)
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
        const sortKey = p => `${p.group ?? ''} / ${p.name}`
        list.sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
        list.sort((a, b) => (a.isBuiltin ? 1 : 0) - (b.isBuiltin ? 1 : 0))
        return list
    }

    providerForProfile (profile: Profile): ProfileProvider|null {
        return this.profileProviders.find(x => x.id === profile.type) ?? null
    }

    selectorOptionForProfile <T> (profile: Profile): SelectorOption<T> {
        profile = this.getConfigProxyForProfile(profile)
        return {
            icon: profile.icon,
            name: profile.group ? `${profile.group} / ${profile.name}` : profile.name,
            description: this.providerForProfile(profile)?.getDescription(profile),
        }
    }

    showProfileSelector (): Promise<Profile|null> {
        return new Promise<Profile|null>(async (resolve, reject) => {
            try {
                const recentProfiles: Profile[] = this.config.store.recentProfiles

                let options: SelectorOption<void>[] = recentProfiles.map(p => ({
                    ...this.selectorOptionForProfile(p),
                    icon: 'fas fa-history',
                    callback: async () => {
                        if (p.id) {
                            p = (await this.getProfiles()).find(x => x.id === p.id) ?? p
                        }
                        resolve(p)
                    },
                }))
                if (recentProfiles.length) {
                    options.push({
                        name: 'Clear recent connections',
                        icon: 'fas fa-eraser',
                        callback: async () => {
                            this.config.store.recentProfiles = []
                            this.config.save()
                            resolve(null)
                        },
                    })
                }

                let profiles = await this.getProfiles()

                if (!this.config.store.terminal.showBuiltinProfiles) {
                    profiles = profiles.filter(x => !x.isBuiltin)
                }

                profiles = profiles.filter(x => !x.isTemplate)

                options = [...options, ...profiles.map((p): SelectorOption<void> => ({
                    ...this.selectorOptionForProfile(p),
                    callback: () => resolve(p),
                }))]

                try {
                    const { SettingsTabComponent } = window['nodeRequire']('tabby-settings')
                    options.push({
                        name: 'Manage profiles',
                        icon: 'fas fa-window-restore',
                        callback: () => {
                            this.app.openNewTabRaw({
                                type: SettingsTabComponent,
                                inputs: { activeTab: 'profiles' },
                            })
                            resolve(null)
                        },
                    })
                } catch { }

                if (this.getProviders().some(x => x.supportsQuickConnect)) {
                    options.push({
                        name: 'Quick connect',
                        freeInputPattern: 'Connect to "%s"...',
                        icon: 'fas fa-arrow-right',
                        callback: query => {
                            const profile = this.quickConnect(query)
                            resolve(profile)
                        },
                    })
                }
                await this.selector.show('Select profile or enter an address', options)
            } catch (err) {
                reject(err)
            }
        })
    }

    async quickConnect (query: string): Promise<Profile|null> {
        for (const provider of this.getProviders()) {
            if (provider.supportsQuickConnect) {
                const profile = provider.quickConnect(query)
                if (profile) {
                    return profile
                }
            }
        }
        this.notifications.error(`Could not parse "${query}"`)
        return null
    }

    getConfigProxyForProfile (profile: Profile): Profile {
        const provider = this.providerForProfile(profile)
        const defaults = configMerge(this.profileDefaults, provider?.configDefaults ?? {})
        return new ConfigProxy(profile, defaults) as unknown as Profile
    }
}
