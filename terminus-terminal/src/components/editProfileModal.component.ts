import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { Profile } from '../api'

@Component({
    template: require('./editProfileModal.component.pug'),
})
export class EditProfileModalComponent {
    profile: Profile

    constructor (
        private modalInstance: NgbActiveModal,
    ) {
    }

    save () {
        this.modalInstance.close(this.profile)
    }

    cancel () {
        this.modalInstance.dismiss()
    }
}
