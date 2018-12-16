import { Component } from '@angular/core'
import { ConfigService } from 'terminus-core'
import { Profile } from '../api'

@Component({
    template: require('./profilesSettingsTab.component.pug'),
})
export class ProfilesSettingsTabComponent {
    profiles: Profile[] = []

    constructor (
        private config: ConfigService,
    ) {
        this.profiles = config.store.terminal.profiles
    }

    async ngOnInit () {
    }

    deleteProfile (profile: Profile) {
        this.profiles = this.profiles.filter(x => x !== profile)
        this.config.store.terminal.profiles = this.profiles
        this.config.save()
    }
}
