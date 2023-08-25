import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { BaseComponent } from 'tabby-core'

/** @hidden */
@Component({
    templateUrl: './sftpCreateDirectoryModal.component.pug',
})
export class SFTPCreateDirectoryModalComponent extends BaseComponent {
    directoryName: string

    constructor (
        private modalInstance: NgbActiveModal,
    ) {
        super()
    }

    create (): void {
        this.modalInstance.close(this.directoryName)
    }

    cancel (): void {
        this.modalInstance.close('')
    }
}
