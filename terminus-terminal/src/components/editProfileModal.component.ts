import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UACService } from '../services/uac.service'
import { Profile } from '../api/interfaces'

/** @hidden */
@Component({
    template: require('./editProfileModal.component.pug'),
})
export class EditProfileModalComponent {
    profile: Profile

    constructor (
        public uac: UACService,
        private modalInstance: NgbActiveModal,
    ) {
    }

    ngOnInit () {
        this.profile.sessionOptions.env = this.profile.sessionOptions.env || {}
        this.profile.sessionOptions.args = this.profile.sessionOptions.args || []
    }

    save () {
        this.modalInstance.close(this.profile)
    }

    cancel () {
        this.modalInstance.dismiss()
    }

    trackByIndex (index) {
        return index
    }
}
