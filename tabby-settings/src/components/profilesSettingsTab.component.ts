import { v4 as uuidv4 } from 'uuid'
import slugify from 'slugify'
import deepClone from 'clone-deep'
import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, HostAppService, Profile, SelectorService, ProfilesService, PromptModalComponent, PlatformService, BaseComponent, PartialProfile } from 'tabby-core'
import { EditProfileModalComponent } from './editProfileModal.component'

interface ProfileGroup {
    name?: string
    profiles: PartialProfile<Profile>[]
    editable: boolean
    collapsed: boolean
}

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
        private profilesService: ProfilesService,
        private selector: SelectorService,
        private ngbModal: NgbModal,
        private platform: PlatformService,
    ) {
        super()
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
                'Select a base profile to use as a template',
                profiles.map(p => ({
                    icon: p.icon,
                    description: this.profilesService.getDescription(p) ?? undefined,
                    name: p.group ? `${p.group} / ${p.name}` : p.name,
                    result: p,
                })),
            )
        }
        const profile = deepClone(base)
        profile.id = null
        profile.name = ''
        profile.isBuiltin = false
        profile.isTemplate = false
        await this.editProfile(profile)
        profile.id = `${profile.type}:custom:${slugify(profile.name)}:${uuidv4()}`
        this.config.store.profiles = [profile, ...this.config.store.profiles]
        await this.config.save()
    }

    async editProfile (profile: PartialProfile<Profile>): Promise<void> {
        const modal = this.ngbModal.open(
            EditProfileModalComponent,
            { size: 'lg' },
        )
        modal.componentInstance.profile = Object.assign({}, profile)
        modal.componentInstance.profileProvider = this.profilesService.providerForProfile(profile)
        const result = await modal.result

        // Fully replace the config
        for (const k in profile) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete profile[k]
        }
        Object.assign(profile, result)

        await this.config.save()
    }

    async deleteProfile (profile: PartialProfile<Profile>): Promise<void> {
        if ((await this.platform.showMessageBox(
            {
                type: 'warning',
                message: `Delete "${profile.name}"?`,
                buttons: ['Keep', 'Delete'],
                defaultId: 0,
            }
        )).response === 1) {
            this.profilesService.providerForProfile(profile)?.deleteProfile(
                this.profilesService.getConfigProxyForProfile(profile))
            this.config.store.profiles = this.config.store.profiles.filter(x => x !== profile)
            await this.config.save()
        }
    }

    refresh (): void {
        this.profiles = this.config.store.profiles
        this.profileGroups = []

        for (const profile of this.profiles) {
            let group = this.profileGroups.find(x => x.name === profile.group)
            if (!group) {
                group = {
                    name: profile.group,
                    profiles: [],
                    editable: true,
                    collapsed: false,
                }
                this.profileGroups.push(group)
            }
            group.profiles.push(profile)
        }

        this.profileGroups.sort((a, b) => a.name?.localeCompare(b.name ?? '') ?? -1)

        this.profileGroups.push({
            name: 'Built-in',
            profiles: this.builtinProfiles,
            editable: false,
            collapsed: false,
        })
    }

    async editGroup (group: ProfileGroup): Promise<void> {
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = 'New name'
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
                message: `Delete "${group.name}"?`,
                buttons: ['Keep', 'Delete'],
                defaultId: 0,
            }
        )).response === 1) {
            if ((await this.platform.showMessageBox(
                {
                    type: 'warning',
                    message: `Delete the group's profiles?`,
                    buttons: ['Move to "Ungrouped"', 'Delete'],
                    defaultId: 0,
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
        return !this.filter || profile.name.toLowerCase().includes(this.filter.toLowerCase())
    }

    iconIsSVG (icon?: string): boolean {
        return icon?.startsWith('<') ?? false
    }

    getDescription (profile: PartialProfile<Profile>): string|null {
        return this.profilesService.getDescription(profile)
    }

    getTypeLabel (profile: PartialProfile<Profile>): string {
        const name = this.profilesService.providerForProfile(profile)?.name
        if (name === 'Local') {
            return ''
        }
        return name ?? 'Unknown'
    }

    getTypeColorClass (profile: PartialProfile<Profile>): string {
        return {
            ssh: 'secondary',
            serial: 'success',
            telnet: 'info',
            'split-layout': 'primary',
        }[this.profilesService.providerForProfile(profile)?.id ?? ''] ?? 'warning'
    }
}
