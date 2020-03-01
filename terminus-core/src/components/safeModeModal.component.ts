import { Component, Input } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

/** @hidden */
@Component({
    template: require('./safeModeModal.component.pug'),
})
export class SafeModeModalComponent {
    @Input() error: Error

    constructor (
        public modalInstance: NgbActiveModal,
    ) {
        this.error = window['safeModeReason']
    }

    close (): void {
        this.modalInstance.dismiss()
    }
}
