import { Component, ViewChild, ElementRef } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

/** @hidden */
@Component({
    template: require('./setVaultPassphraseModal.component.pug'),
})
export class SetVaultPassphraseModalComponent {
    passphrase: string
    @ViewChild('input') input: ElementRef

    constructor (
        private modalInstance: NgbActiveModal,
    ) { }

    ngOnInit (): void {
        setTimeout(() => {
            this.input.nativeElement.focus()
        })
    }

    ok (): void {
        this.modalInstance.close(this.passphrase)
    }

    cancel (): void {
        this.modalInstance.close(null)
    }
}
