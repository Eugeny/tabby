import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService } from 'terminus-core'
import { Profile } from '../api'
import { EditProfileModalComponent } from './editProfileModal.component'

@Component({
    template: require('./profilesSettingsTab.component.pug'),
})
export class ProfilesSettingsTabComponent {
    profiles: Profile[] = []

    constructor (
        private config: ConfigService,
        private ngbModal: NgbModal,
    ) {
        this.profiles = config.store.terminal.profiles
    }

    editProfile (profile: Profile) {
        let modal = this.ngbModal.open(EditProfileModalComponent)
        modal.componentInstance.profile = Object.assign({}, profile)
        modal.result.then(result => {
            Object.assign(profile, result)
            this.config.save()
        })
    }

    deleteProfile (profile: Profile) {
        this.profiles = this.profiles.filter(x => x !== profile)
        this.config.store.terminal.profiles = this.profiles
        this.config.save()
    }
}
