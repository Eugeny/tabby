/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, ViewChild } from '@angular/core'
import { firstBy } from 'thenby'

import { HostAppService, Platform, PartialProfile, ProfilesService, ProfileSettingsComponent, ProxifiedConfig, FullyDefined } from 'tabby-core'
import { LoginScriptsSettingsComponent } from 'tabby-terminal'
import { ForwardedPortConfig, SSHProfile } from 'tabby-ssh'

import { ETProfile } from '../api/interfaces'
import { ETProfilesService } from '../profiles'

/** @hidden */
@Component({
    templateUrl: './etProfileSettings.component.pug',
})
export class ETProfileSettingsComponent implements ProfileSettingsComponent<ETProfile, ETProfilesService> {
    Platform = Platform
    profile: ProxifiedConfig<FullyDefined<ETProfile>>
    sshProfiles: PartialProfile<SSHProfile>[] = []
    @ViewChild('loginScriptsSettings') loginScriptsSettings: LoginScriptsSettingsComponent|null

    constructor (
        public hostApp: HostAppService,
        private profilesService: ProfilesService,
    ) { }

    async ngOnInit (): Promise<void> {
        this.sshProfiles = (await this.profilesService.getProfiles({ includeBuiltin: false }))
            .filter(x => x.type === 'ssh' && x !== this.profile)
        this.sshProfiles.sort(firstBy(x => this.getSSHProfileLabel(x)))
    }

    getSSHProfileLabel (p: PartialProfile<SSHProfile>): string {
        return p.group ? `${this.profilesService.resolveProfileGroupName(p.group)} / ${p.name}` : p.name
    }

    save (): void {
        this.loginScriptsSettings?.save()
    }

    onForwardAdded (fw: ForwardedPortConfig): void {
        this.profile.options.forwardedPorts.push(fw)
    }

    onForwardRemoved (fw: ForwardedPortConfig): void {
        this.profile.options.forwardedPorts = this.profile.options.forwardedPorts.filter(x => x !== fw)
    }
}
