import { Injectable, Inject } from '@angular/core'
import { NewTabParameters } from './tabs.service'
import { BaseTabComponent } from '../components/baseTab.component'
import { PartialProfile, Profile, ProfileProvider } from '../api/profileProvider'
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
        @Inject(ProfileProvider) private profileProviders: ProfileProvider<Profile>[],
    ) { }

    async openNewTabForProfile <P extends Profile> (profile: PartialProfile<P>): Promise<BaseTabComponent|null> {
        const params = await this.newTabParametersForProfile(profile)
        if (params) {
            const tab = this.app.openNewTab(params)
            ;(this.app.getParentTab(tab) ?? tab).color = profile.color ?? null
            return tab
        }
        return null
    }

    async newTabParametersForProfile <P extends Profile> (profile: PartialProfile<P>): Promise<NewTabParameters<BaseTabComponent>|null> {
        const fullProfile = this.getConfigProxyForProfile(profile)
        const params = await this.providerForProfile(fullProfile)?.getNewTabParameters(fullProfile) ?? null
        if (params) {
            params.inputs ??= {}
            params.inputs['title'] = profile.name
            if (profile.disableDynamicTitle) {
                params.inputs['disableDynamicTitle'] = true
            }
        }
        return params
    }

    getProviders (): ProfileProvider<Profile>[] {
        return [...this.profileProviders]
    }

    async getProfiles (): Promise<PartialProfile<Profile>[]> {
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

    providerForProfile <T extends Profile> (profile: PartialProfile<T>): ProfileProvider<T>|null {
        const provider = this.profileProviders.find(x => x.id === profile.type) ?? null
        return provider as unknown as ProfileProvider<T>|null
    }

    getDescription <P extends Profile> (profile: PartialProfile<P>): string|null {
        profile = this.getConfigProxyForProfile(profile)
        return this.providerForProfile(profile)?.getDescription(profile) ?? null
    }

    selectorOptionForProfile <P extends Profile, T> (profile: PartialProfile<P>): SelectorOption<T> {
        const fullProfile = this.getConfigProxyForProfile(profile)
        return {
            ...profile,
            description: this.providerForProfile(fullProfile)?.getDescription(fullProfile),
        }
    }

    getRecentProfiles (): PartialProfile<Profile>[] {
        let recentProfiles: PartialProfile<Profile>[] = JSON.parse(window.localStorage['recentProfiles'] ?? '[]')
        recentProfiles = recentProfiles.slice(0, this.config.store.terminal.showRecentProfiles)
        return recentProfiles
    }

    showProfileSelector (): Promise<PartialProfile<Profile>|null> {
        return new Promise<PartialProfile<Profile>|null>(async (resolve, reject) => {
            try {
                const recentProfiles = this.getRecentProfiles()

                let options: SelectorOption<void>[] = recentProfiles.map(p => ({
                    ...this.selectorOptionForProfile(p),
                    group: 'Recent',
                    icon: 'fas fa-history',
                    color: p.color,
                    callback: async () => {
                        if (p.id) {
                            p = (await this.getProfiles()).find(x => x.id === p.id) ?? p
                        }
                        resolve(p)
                    },
                }))
                if (recentProfiles.length) {
                    options.push({
                        name: 'Clear recent profiles',
                        group: 'Recent',
                        icon: 'fas fa-eraser',
                        callback: async () => {
                            window.localStorage.removeItem('recentProfiles')
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

    async quickConnect (query: string): Promise<PartialProfile<Profile>|null> {
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

    getConfigProxyForProfile <T extends Profile> (profile: PartialProfile<T>, skipUserDefaults = false): T {
        const provider = this.providerForProfile(profile)
        const defaults = [
            this.profileDefaults,
            provider?.configDefaults ?? {},
            !provider || skipUserDefaults ? {} : this.config.store.profileDefaults[provider.id] ?? {},
        ].reduce(configMerge, {})
        return new ConfigProxy(profile, defaults) as unknown as T
    }

    async launchProfile (profile: PartialProfile<Profile>): Promise<void> {
        await this.openNewTabForProfile(profile)

        let recentProfiles: PartialProfile<Profile>[] = JSON.parse(window.localStorage['recentProfiles'] ?? '[]')
        if (this.config.store.terminal.showRecentProfiles > 0) {
            recentProfiles = recentProfiles.filter(x => x.group !== profile.group || x.name !== profile.name)
            recentProfiles.unshift(profile)
            recentProfiles = recentProfiles.slice(0, this.config.store.terminal.showRecentProfiles)
        } else {
            recentProfiles = []
        }
        window.localStorage['recentProfiles'] = JSON.stringify(recentProfiles)
    }
}
