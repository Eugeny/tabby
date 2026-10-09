import { Component, ViewChild, ElementRef } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { VaultBiometricsService } from '../services/vaultBiometrics.service'

/** @hidden */
@Component({
    templateUrl: './unlockVaultModal.component.pug',
})
export class UnlockVaultModalComponent {
    passphrase: string
    rememberFor = 1
    rememberOptions = [1, 5, 15, 60, 1440, 10080]
    touchIdEnabled = false
    canUseTouchId = false
    touchIdError = ''
    @ViewChild('input') input: ElementRef

    constructor (
        private modalInstance: NgbActiveModal,
        private biometrics: VaultBiometricsService,
    ) { }

    async ngOnInit (): Promise<void> {
        const stored = window.localStorage.vaultRememberPassphraseFor
        if (stored === undefined || stored === null || stored === '') {
            this.rememberFor = 1
        } else {
            const parsed = parseInt(stored, 10)
            this.rememberFor = isNaN(parsed) ? 1 : parsed
        }

        this.touchIdEnabled = this.biometrics.getSettings().enabled && await this.biometrics.isAvailable()
        this.canUseTouchId = this.touchIdEnabled && this.biometrics.canUnlock()
        if (this.canUseTouchId) {
            await this.unlockWithTouchId()
        }

        setTimeout(() => {
            this.input.nativeElement.focus()
        })
    }

    async unlockWithTouchId (): Promise<void> {
        this.touchIdError = ''
        try {
            this.close(await this.biometrics.unlock(), true)
        } catch (e) {
            // Cancelled, or the stored passphrase could not be used
            this.touchIdError = e.message
            this.canUseTouchId = this.biometrics.canUnlock()
        }
    }

    ok (): void {
        this.close(this.passphrase, false)
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

    private close (passphrase: string, fromBiometrics: boolean): void {
        window.localStorage.vaultRememberPassphraseFor = this.rememberFor
        this.modalInstance.close({
            passphrase,
            rememberFor: this.rememberFor,
            fromBiometrics,
        })
    }
}
