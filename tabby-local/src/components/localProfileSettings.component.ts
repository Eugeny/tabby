/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Inject, Optional } from '@angular/core'
import { LocalProfile, UACService } from '../api'
import { PlatformService, ProfileSettingsComponent } from 'tabby-core'


/** @hidden */
@Component({
    templateUrl: './localProfileSettings.component.pug',
})
export class LocalProfileSettingsComponent implements ProfileSettingsComponent<LocalProfile> {
    profile: LocalProfile

    constructor (
        @Optional() @Inject(UACService) public uac: UACService|undefined,
        private platform: PlatformService,
    ) { }

    ngOnInit () {
        this.profile.options.env = this.profile.options.env ?? {}
        this.profile.options.args = this.profile.options.args ?? []
    }

    async pickWorkingDirectory (): Promise<void> {
        // const profile = await this.terminal.getProfileByID(this.config.store.terminal.profile)
        // const shell = this.shells.find(x => x.id === profile?.shell)
        // if (!shell) {
        //     return
        // }

        this.profile.options.cwd = await this.platform.pickDirectory()
    }
}
