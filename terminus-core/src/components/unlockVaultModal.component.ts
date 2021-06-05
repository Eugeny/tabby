import { Component, ViewChild, ElementRef } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

/** @hidden */
@Component({
    template: require('./unlockVaultModal.component.pug'),
})
export class UnlockVaultModalComponent {
    passphrase: string
    rememberFor = 1
    rememberOptions = [1, 5, 15, 60]
    @ViewChild('input') input: ElementRef

    constructor (
        private modalInstance: NgbActiveModal,
    ) { }

    ngOnInit (): void {
        this.rememberFor = parseInt(window.localStorage.vaultRememberPassphraseFor ?? 0)
        setTimeout(() => {
            this.input.nativeElement.focus()
        })
    }

    ok (): void {
        window.localStorage.vaultRememberPassphraseFor = this.rememberFor
        this.modalInstance.close({
            passphrase: this.passphrase,
            rememberFor: this.rememberFor,
        })
    }

    cancel (): void {
        this.modalInstance.close(null)
    }
}
