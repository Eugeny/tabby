import { Component, Input } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

@Component({
    selector: 'rename-tab-modal',
    template: require('./renameTabModal.component.pug'),
})
export class RenameTabModalComponent {
    @Input() value: string

    constructor (
        private modalInstance: NgbActiveModal
    ) { }

    save () {
        this.modalInstance.close(this.value)
    }

    close () {
        this.modalInstance.dismiss()
    }
}
