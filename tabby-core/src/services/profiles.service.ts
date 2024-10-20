import { Injectable, Inject } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { NewTabParameters } from './tabs.service'
import { BaseTabComponent } from '../components/baseTab.component'
import { QuickConnectProfileProvider, PartialProfile, PartialProfileGroup, Profile, ProfileGroup, ProfileProvider } from '../api/profileProvider'
import { SelectorOption } from '../api/selector'
import { AppService } from './app.service'
import { configMerge, ConfigProxy, ConfigService } from './config.service'
import { NotificationsService } from './notifications.service'
import { SelectorService } from './selector.service'
import deepClone from 'clone-deep'
import { v4 as uuidv4 } from 'uuid'
import slugify from 'slugify'

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
        terminalColorScheme: null,
        behaviorOnSessionEnd: 'auto',
    }

    constructor (
        private app: AppService,
        private config: ConfigService,
        private notifications: NotificationsService,
        private selector: SelectorService,
        private translate: TranslateService,
        @Inject(ProfileProvider) private profileProviders: ProfileProvider<Profile>[],
    ) { }

    /*
    * Methods used to interact with ProfileProvider
    */

    getProviders (): ProfileProvider<Profile>[] {
        return [...this.profileProviders]
    }

    providerForProfile <T extends Profile> (profile: PartialProfile<T>): ProfileProvider<T>|null {
        const provider = this.profileProviders.find(x => x.id === profile.type) ?? null
        return provider as unknown as ProfileProvider<T>|null
    }

    getDescription <P extends Profile> (profile: PartialProfile<P>): string|null {
        profile = this.getConfigProxyForProfile(profile)
        return this.providerForProfile(profile)?.getDescription(profile) ?? null
    }

    /*
    * Methods used to interact with Profile
    */

    /*
    * Return ConfigProxy for a given Profile
    * arg: skipUserDefaults -> do not merge global provider defaults in ConfigProxy
    * arg: skipGroupDefaults -> do not merge parent group provider defaults in ConfigProxy
    */
    getConfigProxyForProfile <T extends Profile> (profile: PartialProfile<T>, options?: { skipGlobalDefaults?: boolean, skipGroupDefaults?: boolean }): T {
        const defaults = this.getProfileDefaults(profile, options).reduce(configMerge, {})
        return new ConfigProxy(profile, defaults) as unknown as T
    }

    /**
    * Return an Array of Profiles
    * arg: includeBuiltin (default: true) -> include BuiltinProfiles
    * arg: clone (default: false) -> return deepclone Array
    */
    async getProfiles (options?: { includeBuiltin?: boolean, clone?: boolean }): Promise<PartialProfile<Profile>[]> {
        let list = this.config.store.profiles ?? []
        if (options?.includeBuiltin ?? true) {
            const lists = await Promise.all(this.config.enabledServices(this.profileProviders).map(x => x.getBuiltinProfiles()))
            list = [
                ...this.config.store.profiles ?? [],
                ...lists.reduce((a, b) => a.concat(b), []),
            ]
        }

        const sortKey = p => `${this.resolveProfileGroupName(p.group ?? '')} / ${p.name}`
        list.sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
        list.sort((a, b) => (a.isBuiltin ? 1 : 0) - (b.isBuiltin ? 1 : 0))
        return options?.clone ? deepClone(list) : list
    }

    /**
    * Insert a new Profile in config
    * arg: genId (default: true) -> generate uuid in before pushing Profile into config
    */
    async newProfile (profile: PartialProfile<Profile>, options?: { genId?: boolean }): Promise<void> {
        if (options?.genId ?? true) {
            profile.id = `${profile.type}:custom:${slugify(profile.name)}:${uuidv4()}`
        }

        const cProfile = this.config.store.profiles.find(p => p.id === profile.id)
        if (cProfile) {
            throw new Error(`Cannot insert new Profile, duplicated Id: ${profile.id}`)
        }

        this.config.store.profiles.push(profile)
    }

    /**
    * Write a Profile in config
    */
    async writeProfile (profile: PartialProfile<Profile>): Promise<void> {
        const cProfile = this.config.store.profiles.find(p => p.id === profile.id)
        if (cProfile) {
            // Fully replace the config
            for (const k in cProfile) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete cProfile[k]
            }
            Object.assign(cProfile, profile)
        }
    }

    /**
    * Delete a Profile from config
    */
    async deleteProfile (profile: PartialProfile<Profile>): Promise<void> {
        this.providerForProfile(profile)?.deleteProfile(this.getConfigProxyForProfile(profile))
        this.config.store.profiles = this.config.store.profiles.filter(p => p.id !== profile.id)

        const profileHotkeyName = ProfilesService.getProfileHotkeyName(profile)
        if (this.config.store.hotkeys.profile.hasOwnProperty(profileHotkeyName)) {
            const profileHotkeys = deepClone(this.config.store.hotkeys.profile)
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete profileHotkeys[profileHotkeyName]
            this.config.store.hotkeys.profile = profileHotkeys
        }
    }

    /**
    * Delete all Profiles from config using option filter
    * arg: filter (p: PartialProfile<Profile>) => boolean -> predicate used to decide which profiles have to be deleted
    */
    async bulkDeleteProfiles (filter: (p: PartialProfile<Profile>) => boolean): Promise<void> {
        for (const profile of this.config.store.profiles.filter(filter)) {
            this.providerForProfile(profile)?.deleteProfile(this.getConfigProxyForProfile(profile))

            const profileHotkeyName = ProfilesService.getProfileHotkeyName(profile)
            if (this.config.store.hotkeys.profile.hasOwnProperty(profileHotkeyName)) {
                const profileHotkeys = deepClone(this.config.store.hotkeys.profile)
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete profileHotkeys[profileHotkeyName]
                this.config.store.hotkeys.profile = profileHotkeys
            }
        }

        this.config.store.profiles = this.config.store.profiles.filter(x => !filter(x))
    }

    async openNewTabForProfile <P extends Profile> (profile: PartialProfile<P>): Promise<BaseTabComponent|null> {
        const params = await this.newTabParametersForProfile(profile)
        if (params) {
            return this.app.openNewTab(params)
        }
        return null
    }

    async newTabParametersForProfile <P extends Profile> (profile: PartialProfile<P>): Promise<NewTabParameters<BaseTabComponent>|null> {
        const fullProfile = this.getConfigProxyForProfile(profile)
        const params = await this.providerForProfile(fullProfile)?.getNewTabParameters(fullProfile) ?? null
        if (params) {
            params.inputs ??= {}
            params.inputs['title'] = profile.name
            if (fullProfile.disableDynamicTitle) {
                params.inputs['disableDynamicTitle'] = true
            }
            if (fullProfile.color) {
                params.inputs['color'] = fullProfile.color
            }
            if (fullProfile.icon) {
                params.inputs['icon'] = fullProfile.icon
            }
        }
        return params
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

    static getProfileHotkeyName (profile: PartialProfile<Profile>): string {
        return (profile.id ?? profile.name).replace(/\./g, '-')
    }

    /*
    * Methods used to interact with Profile Selector
    */

    selectorOptionForProfile <P extends Profile, T> (profile: PartialProfile<P>): SelectorOption<T> {
        const fullProfile = this.getConfigProxyForProfile(profile)
        const provider = this.providerForProfile(fullProfile)
        const freeInputEquivalent = provider instanceof QuickConnectProfileProvider ? provider.intoQuickConnectString(fullProfile) ?? undefined : undefined
        return {
            ...profile,
            group: this.resolveProfileGroupName(profile.group ?? ''),
            freeInputEquivalent,
            description: provider?.getDescription(fullProfile),
        }
    }

    showProfileSelector (): Promise<PartialProfile<Profile>|null> {
        if (this.selector.active) {
            return Promise.resolve(null)
        }

        return new Promise<PartialProfile<Profile>|null>(async (resolve, reject) => {
            try {
                const recentProfiles = this.getRecentProfiles()

                let options: SelectorOption<void>[] = recentProfiles.map((p, i) => ({
                    ...this.selectorOptionForProfile(p),
                    group: this.translate.instant('Recent'),
                    icon: 'fas fa-history',
                    color: p.color,
                    weight: i - (recentProfiles.length + 1),
                    callback: async () => {
                        if (p.id) {
                            p = (await this.getProfiles()).find(x => x.id === p.id) ?? p
                        }
                        resolve(p)
                    },
                }))
                if (recentProfiles.length) {
                    options.push({
                        name: this.translate.instant('Clear recent profiles'),
                        group: this.translate.instant('Recent'),
                        icon: 'fas fa-eraser',
                        weight: -1,
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

                profiles = profiles.filter(x => x.id && !this.config.store.profileBlacklist.includes(x.id))

                options = [...options, ...profiles.map((p): SelectorOption<void> => ({
                    ...this.selectorOptionForProfile(p),
                    weight: p.isBuiltin ? 2 : 1,
                    callback: () => resolve(p),
                }))]

                try {
                    const { SettingsTabComponent } = window['nodeRequire']('tabby-settings')
                    options.push({
                        name: this.translate.instant('Manage profiles'),
                        icon: 'fas fa-window-restore',
                        weight: 10,
                        callback: () => {
                            this.app.openNewTabRaw({
                                type: SettingsTabComponent,
                                inputs: { activeTab: 'profiles' },
                            })
                            resolve(null)
                        },
                    })
                } catch { }

                this.getProviders().forEach(provider => {
                    if (provider instanceof QuickConnectProfileProvider) {
                        options.push({
                            name: this.translate.instant('Quick connect'),
                            freeInputPattern: this.translate.instant('Connect to "%s"...'),
                            description: `(${provider.name.toUpperCase()})`,
                            icon: 'fas fa-arrow-right',
                            weight: provider.id !== this.config.store.defaultQuickConnectProvider ? 1 : 0,
                            callback: query => {
                                const profile = provider.quickConnect(query)
                                resolve(profile)
                            },
                        })
                    }
                })

                await this.selector.show(this.translate.instant('Select profile or enter an address'), options).catch(() => reject())
            } catch (err) {
                reject(err)
            }
        })
    }

    getRecentProfiles (): PartialProfile<Profile>[] {
        let recentProfiles: PartialProfile<Profile>[] = JSON.parse(window.localStorage['recentProfiles'] ?? '[]')
        recentProfiles = recentProfiles.slice(0, this.config.store.terminal.showRecentProfiles)
        return recentProfiles
    }

    async quickConnect (query: string): Promise<PartialProfile<Profile>|null> {
        for (const provider of this.getProviders()) {
            if (provider instanceof QuickConnectProfileProvider) {
                const profile = provider.quickConnect(query)
                if (profile) {
                    return profile
                }
            }
        }
        this.notifications.error(`Could not parse "${query}"`)
        return null
    }

    /*
    * Methods used to interact with Profile/ProfileGroup/Global defaults
    */

    /**
    * Return global defaults for a given profile provider
    * Always return something, empty object if no defaults found
    */
    getProviderDefaults (provider: ProfileProvider<Profile>): any {
        const defaults = this.config.store.profileDefaults
        return defaults[provider.id] ?? {}
    }

    /**
    * Set global defaults for a given profile provider
    */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    setProviderDefaults (provider: ProfileProvider<Profile>, pdefaults: any): void {
        this.config.store.profileDefaults[provider.id] = pdefaults
    }

    /**
    * Return defaults for a given profile
    * Always return something, empty object if no defaults found
    * arg: skipUserDefaults -> do not merge global provider defaults in ConfigProxy
    * arg: skipGroupDefaults -> do not merge parent group provider defaults in ConfigProxy
    */
    getProfileDefaults (profile: PartialProfile<Profile>, options?: { skipGlobalDefaults?: boolean, skipGroupDefaults?: boolean }): any[] {
        const provider = this.providerForProfile(profile)

        return [
            this.profileDefaults,
            provider?.configDefaults ?? {},
            provider && !options?.skipGlobalDefaults ? this.getProviderDefaults(provider) : {},
            provider && !options?.skipGlobalDefaults && !options?.skipGroupDefaults ? this.getProviderProfileGroupDefaults(profile.group ?? '', provider) : {},
        ]
    }

    /*
    * Methods used to interact with ProfileGroup
    */

    /**
    * Synchronously return an Array of the existing ProfileGroups
    * Does not return builtin groups
    */
    getSyncProfileGroups (): PartialProfileGroup<ProfileGroup>[] {
        return deepClone(this.config.store.groups ?? [])
    }

    /**
    * Return an Array of the existing ProfileGroups
    * arg: includeProfiles (default: false) -> if false, does not fill up the profiles field of ProfileGroup
    * arg: includeNonUserGroup (default: false) -> if false, does not add built-in and ungrouped groups
    */
    async getProfileGroups (options?: { includeProfiles?: boolean, includeNonUserGroup?: boolean }): Promise<PartialProfileGroup<ProfileGroup>[]> {
        let profiles: PartialProfile<Profile>[] = []
        if (options?.includeProfiles) {
            profiles = await this.getProfiles({ includeBuiltin: options.includeNonUserGroup, clone: true })
        }

        let groups: PartialProfileGroup<ProfileGroup>[] = this.getSyncProfileGroups()
        groups = groups.map(x => {
            x.editable = true

            if (options?.includeProfiles) {
                x.profiles = profiles.filter(p => p.group === x.id)
                profiles = profiles.filter(p => p.group !== x.id)
            }

            return x
        })

        if (options?.includeNonUserGroup) {
            const builtInGroups: PartialProfileGroup<ProfileGroup>[] = []
            builtInGroups.push({
                id: 'built-in',
                name: this.translate.instant('Built-in'),
                editable: false,
                profiles: [],
            })

            const ungrouped: PartialProfileGroup<ProfileGroup> = {
                id: 'ungrouped',
                name: this.translate.instant('Ungrouped'),
                editable: false,
            }

            if (options.includeProfiles) {
                for (const profile of profiles.filter(p => p.isBuiltin)) {
                    let group: PartialProfileGroup<ProfileGroup> | undefined = builtInGroups.find(g => g.id === slugify(profile.group ?? 'built-in'))
                    if (!group) {
                        group = {
                            id: `${slugify(profile.group!)}`,
                            name: `${profile.group!}`,
                            editable: false,
                            profiles: [],
                        }
                        builtInGroups.push(group)
                    }

                    group.profiles!.push(profile)
                }

                ungrouped.profiles = profiles.filter(p => !p.isBuiltin)
            }

            groups = groups.concat(builtInGroups)
            groups.push(ungrouped)
        }

        return groups
    }

    /**
    * Insert a new ProfileGroup in config
    * arg: genId (default: true) -> generate uuid in before pushing Profile into config
    */
    async newProfileGroup (group: PartialProfileGroup<ProfileGroup>, options?: { genId?: boolean }): Promise<void> {
        if (options?.genId ?? true) {
            group.id = `${uuidv4()}`
        }

        const cProfileGroup = this.config.store.groups.find(p => p.id === group.id)
        if (cProfileGroup) {
            throw new Error(`Cannot insert new ProfileGroup, duplicated Id: ${group.id}`)
        }

        this.config.store.groups.push(group)
    }

    /**
    * Write a ProfileGroup in config
    */
    async writeProfileGroup (group: PartialProfileGroup<ProfileGroup>): Promise<void> {
        delete group.profiles
        delete group.editable

        const cGroup = this.config.store.groups.find(g => g.id === group.id)
        if (cGroup) {
            Object.assign(cGroup, group)
        }
    }

    /**
    * Delete a ProfileGroup from config
    */
    async deleteProfileGroup (group: PartialProfileGroup<ProfileGroup>, options?: { deleteProfiles?: boolean }): Promise<void> {
        this.config.store.groups = this.config.store.groups.filter(g => g.id !== group.id)
        if (options?.deleteProfiles) {
            await this.bulkDeleteProfiles((p) => p.group === group.id)
        } else {
            for (const profile of this.config.store.profiles.filter(x => x.group === group.id)) {
                delete profile.group
            }
        }
        if (this.config.store.hotkeys['group-selectors'].hasOwnProperty(group.id)) {
            const groupSelectorsHotkeys = { ...this.config.store.hotkeys['group-selectors'] }
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete groupSelectorsHotkeys[group.id]
            this.config.store.hotkeys['group-selectors'] = groupSelectorsHotkeys
        }
    }

    /**
    * Resolve and return ProfileGroup Name from ProfileGroup ID
    */
    resolveProfileGroupName (groupId: string): string {
        return this.config.store.groups.find(g => g.id === groupId)?.name ?? groupId
    }

    /**
    * Return defaults for a given group ID and provider
    * Always return something, empty object if no defaults found
    * arg: skipUserDefaults -> do not merge global provider defaults in ConfigProxy
    */
    getProviderProfileGroupDefaults (groupId: string, provider: ProfileProvider<Profile>): any {
        return this.getSyncProfileGroups().find(g => g.id === groupId)?.defaults?.[provider.id] ?? {}
    }

}
