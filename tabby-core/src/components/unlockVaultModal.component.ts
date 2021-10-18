import { Component, ViewChild, ElementRef } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

/** @hidden */
@Component({
    template: require('./unlockVaultModal.component.pug'),
})
export class UnlockVaultModalComponent {
    passphrase: string
    rememberFor = 1
    rememberOptions = [1, 5, 15, 60, 1440, 10080]
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

    getRememberForDisplay (rememberOption: number): string {
        if (rememberOption >= 1440) {
            return `${Math.round(rememberOption/1440*10)/10} day`
        } else if (rememberOption >= 60) {
            return `${Math.round(rememberOption/60*10)/10} hour`
        } else {
            return `${rememberOption} min`
        }
    }
}
