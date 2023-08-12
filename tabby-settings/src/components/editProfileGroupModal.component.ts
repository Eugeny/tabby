/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigProxy, ProfileGroup, Profile, ProfileProvider, PlatformService, TranslateService } from 'tabby-core'

/** @hidden */
@Component({
    templateUrl: './editProfileGroupModal.component.pug',
})
export class EditProfileGroupModalComponent<G extends ProfileGroup> {
    @Input() group: G & ConfigProxy
    @Input() providers: ProfileProvider<Profile>[]

    constructor (
        private modalInstance: NgbActiveModal,
        private platform: PlatformService,
        private translate: TranslateService,
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

    async deleteDefaults (provider: ProfileProvider<Profile>): Promise<void> {
        if ((await this.platform.showMessageBox(
            {
                type: 'warning',
                message: this.translate.instant('Restore settings to inherited defaults ?'),
                buttons: [
                    this.translate.instant('Delete'),
                    this.translate.instant('Keep'),
                ],
                defaultId: 1,
                cancelId: 1,
            },
        )).response === 0) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this.group.defaults?.[provider.id]
        }
    }
}

export interface EditProfileGroupModalComponentResult<G extends ProfileGroup> {
    group: G
    provider?: ProfileProvider<Profile>
}
