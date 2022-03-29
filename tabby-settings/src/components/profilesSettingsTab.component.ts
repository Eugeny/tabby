import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { v4 as uuidv4 } from 'uuid'
import slugify from 'slugify'
import deepClone from 'clone-deep'
import { Component, Inject } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, HostAppService, Profile, SelectorService, ProfilesService, PromptModalComponent, PlatformService, BaseComponent, PartialProfile, ProfileProvider, TranslateService } from 'tabby-core'
import { EditProfileModalComponent } from './editProfileModal.component'

interface ProfileGroup {
    name?: string
    profiles: PartialProfile<Profile>[]
    editable: boolean
    collapsed: boolean
}

_('Ungrouped')

/** @hidden */
@Component({
    template: require('./profilesSettingsTab.component.pug'),
    styles: [require('./profilesSettingsTab.component.scss')],
})
export class ProfilesSettingsTabComponent extends BaseComponent {
    profiles: PartialProfile<Profile>[] = []
    builtinProfiles: PartialProfile<Profile>[] = []
    templateProfiles: PartialProfile<Profile>[] = []
    profileGroups: ProfileGroup[]
    filter = ''

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
        @Inject(ProfileProvider) public profileProviders: ProfileProvider<Profile>[],
        private profilesService: ProfilesService,
        private selector: SelectorService,
        private ngbModal: NgbModal,
        private platform: PlatformService,
        private translate: TranslateService,
    ) {
        super()
        this.profileProviders.sort((a, b) => a.name.localeCompare(b.name))
    }

    async ngOnInit (): Promise<void> {
        this.refresh()
        this.builtinProfiles = (await this.profilesService.getProfiles()).filter(x => x.isBuiltin)
        this.templateProfiles = this.builtinProfiles.filter(x => x.isTemplate)
        this.builtinProfiles = this.builtinProfiles.filter(x => !x.isTemplate)
        this.refresh()
        this.subscribeUntilDestroyed(this.config.changed$, () => this.refresh())
    }

    launchProfile (profile: PartialProfile<Profile>): void {
        this.profilesService.openNewTabForProfile(profile)
    }

    async newProfile (base?: PartialProfile<Profile>): Promise<void> {
        if (!base) {
            const profiles = [...this.templateProfiles, ...this.builtinProfiles, ...this.profiles]
            profiles.sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0))
            base = await this.selector.show(
                this.translate.instant('Select a base profile to use as a template'),
                profiles.map(p => ({
                    icon: p.icon,
                    description: this.profilesService.getDescription(p) ?? undefined,
                    name: p.group ? `${p.group} / ${p.name}` : p.name,
                    result: p,
                })),
            )
        }
        const profile: PartialProfile<Profile> = deepClone(base)
        delete profile.id
        if (base.isTemplate) {
            profile.name = ''
        } else if (!base.isBuiltin) {
            profile.name = this.translate.instant('{name} copy', base)
        }
        profile.isBuiltin = false
        profile.isTemplate = false
        await this.showProfileEditModal(profile)
        if (!profile.name) {
            const cfgProxy = this.profilesService.getConfigProxyForProfile(profile)
            profile.name = this.profilesService.providerForProfile(profile)?.getSuggestedName(cfgProxy) ?? this.translate.instant('{name} copy', base)
        }
        profile.id = `${profile.type}:custom:${slugify(profile.name)}:${uuidv4()}`
        this.config.store.profiles = [profile, ...this.config.store.profiles]
        await this.config.save()
    }

    async editProfile (profile: PartialProfile<Profile>): Promise<void> {
        await this.showProfileEditModal(profile)
        await this.config.save()
    }

    async showProfileEditModal (profile: PartialProfile<Profile>): Promise<void> {
        const modal = this.ngbModal.open(
            EditProfileModalComponent,
            { size: 'lg' },
        )
        const provider = this.profilesService.providerForProfile(profile)
        if (!provider) {
            throw new Error('Cannot edit a profile without a provider')
        }
        modal.componentInstance.profile = deepClone(profile)
        modal.componentInstance.profileProvider = provider

        const result = await modal.result.catch(() => null)
        if (!result) {
            return
        }

        // Fully replace the config
        for (const k in profile) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete profile[k]
        }
        Object.assign(profile, result)

        profile.type = provider.id
    }

    async deleteProfile (profile: PartialProfile<Profile>): Promise<void> {
        if ((await this.platform.showMessageBox(
            {
                type: 'warning',
                message: this.translate.instant('Delete "{name}"?', profile),
                buttons: [
                    this.translate.instant('Delete'),
                    this.translate.instant('Keep'),
                ],
                defaultId: 1,
                cancelId: 1,
            }
        )).response === 0) {
            this.profilesService.providerForProfile(profile)?.deleteProfile(
                this.profilesService.getConfigProxyForProfile(profile))
            this.config.store.profiles = this.config.store.profiles.filter(x => x !== profile)
            await this.config.save()
        }
    }

    refresh (): void {
        this.profiles = this.config.store.profiles
        this.profileGroups = []
        const profileGroupCollapsed = JSON.parse(window.localStorage.profileGroupCollapsed ?? '{}')

        for (const profile of this.profiles) {
            let group = this.profileGroups.find(x => x.name === profile.group)
            if (!group) {
                group = {
                    name: profile.group,
                    profiles: [],
                    editable: true,
                    collapsed: profileGroupCollapsed[profile.group ?? ''] ?? false,
                }
                this.profileGroups.push(group)
            }
            group.profiles.push(profile)
        }

        this.profileGroups.sort((a, b) => a.name?.localeCompare(b.name ?? '') ?? -1)

        const builtIn = {
            name: this.translate.instant('Built-in'),
            profiles: this.builtinProfiles,
            editable: false,
            collapsed: false,
        }
        builtIn.collapsed = profileGroupCollapsed[builtIn.name ?? ''] ?? false
        this.profileGroups.push(builtIn)
    }

    async editGroup (group: ProfileGroup): Promise<void> {
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = this.translate.instant('New name')
        modal.componentInstance.value = group.name
        const result = await modal.result
        if (result) {
            for (const profile of this.profiles.filter(x => x.group === group.name)) {
                profile.group = result.value
            }
            this.config.store.profiles = this.profiles
            await this.config.save()
        }
    }

    async deleteGroup (group: ProfileGroup): Promise<void> {
        if ((await this.platform.showMessageBox(
            {
                type: 'warning',
                message: this.translate.instant('Delete "{name}"?', group),
                buttons: [
                    this.translate.instant('Delete'),
                    this.translate.instant('Keep'),
                ],
                defaultId: 1,
                cancelId: 1,
            }
        )).response === 0) {
            if ((await this.platform.showMessageBox(
                {
                    type: 'warning',
                    message: this.translate.instant('Delete the group\'s profiles?'),
                    buttons: [
                        this.translate.instant('Move to "Ungrouped"'),
                        this.translate.instant('Delete'),
                    ],
                    defaultId: 0,
                    cancelId: 0,
                }
            )).response === 0) {
                for (const profile of this.profiles.filter(x => x.group === group.name)) {
                    delete profile.group
                }
            } else {
                this.config.store.profiles = this.config.store.profiles.filter(x => x.group !== group.name)
            }
            await this.config.save()
        }
    }

    isGroupVisible (group: ProfileGroup): boolean {
        return !this.filter || group.profiles.some(x => this.isProfileVisible(x))
    }

    isProfileVisible (profile: PartialProfile<Profile>): boolean {
        return !this.filter || (profile.name + '$' + (this.getDescription(profile) ?? '')).toLowerCase().includes(this.filter.toLowerCase())
    }

    getDescription (profile: PartialProfile<Profile>): string|null {
        return this.profilesService.getDescription(profile)
    }

    getTypeLabel (profile: PartialProfile<Profile>): string {
        const name = this.profilesService.providerForProfile(profile)?.name
        if (name === this.translate.instant('Local terminal')) {
            return ''
        }
        return name ?? this.translate.instant('Unknown')
    }

    getTypeColorClass (profile: PartialProfile<Profile>): string {
        return {
            ssh: 'secondary',
            serial: 'success',
            telnet: 'info',
            'split-layout': 'primary',
        }[this.profilesService.providerForProfile(profile)?.id ?? ''] ?? 'warning'
    }

    toggleGroupCollapse (group: ProfileGroup): void {
        group.collapsed = !group.collapsed
        const profileGroupCollapsed = JSON.parse(window.localStorage.profileGroupCollapsed ?? '{}')
        profileGroupCollapsed[group.name ?? ''] = group.collapsed
        window.localStorage.profileGroupCollapsed = JSON.stringify(profileGroupCollapsed)
    }

    async editDefaults (provider: ProfileProvider<Profile>): Promise<void> {
        const modal = this.ngbModal.open(
            EditProfileModalComponent,
            { size: 'lg' },
        )
        const model = this.config.store.profileDefaults[provider.id] ?? {}
        model.type = provider.id
        modal.componentInstance.profile = Object.assign({}, model)
        modal.componentInstance.profileProvider = provider
        modal.componentInstance.defaultsMode = true
        const result = await modal.result

        // Fully replace the config
        for (const k in model) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete model[k]
        }
        Object.assign(model, result)
        this.config.store.profileDefaults[provider.id] = model
        await this.config.save()
    }
}
