/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigProxy, ProfileGroup, Profile, ProfileProvider } from 'tabby-core'

/** @hidden */
@Component({
    templateUrl: './editProfileGroupModal.component.pug',
})
export class EditProfileGroupModalComponent<G extends ProfileGroup> {
    @Input() group: G & ConfigProxy
    @Input() providers: ProfileProvider<Profile>[]

    constructor (
        private modalInstance: NgbActiveModal,
    ) {}

    save () {
        this.modalInstance.close({ group: this.group })
    }

    cancel () {
        this.modalInstance.dismiss()
    }

    editDefaults (provider: ProfileProvider<Profile>) {
        this.modalInstance.close({ group: this.group, provider })
    }
}

export interface EditProfileGroupModalComponentResult<G extends ProfileGroup> {
    group: G
    provider?: ProfileProvider<Profile>
}
