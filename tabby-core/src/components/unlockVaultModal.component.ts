import { Component, ViewChild, ElementRef } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { PlatformService } from '../api/platform'
import { TranslateService } from '@ngx-translate/core'

/** @hidden */
@Component({
    templateUrl: './unlockVaultModal.component.pug',
})
export class UnlockVaultModalComponent {
    passphrase: string
    rememberFor = 1
    rememberOptions = [1, 5, 15, 60, 1440, 10080]
    @ViewChild('input') input: ElementRef

    touchIdAvailable = false
    touchIdEnabled = false
    touchIdExpired = false
    touchIdError = ''

    constructor (
        private modalInstance: NgbActiveModal,
        private platform: PlatformService,
        private translate: TranslateService,
    ) { }

    async ngOnInit (): Promise<void> {
        this.rememberFor = parseInt(window.localStorage.vaultRememberPassphraseFor ?? 0)

        // Check Touch ID availability and status
        const biometricAvailable = await (this.platform.isBiometricAuthAvailable() as any)
        const secureStorageAvailable = await (this.platform.isSecureStorageAvailable() as any)
        this.touchIdAvailable = biometricAvailable && secureStorageAvailable

        const touchIdSettings = this.platform.getTouchIdSettings()
        this.touchIdEnabled = touchIdSettings.enabled

        if (this.touchIdAvailable && this.touchIdEnabled) {
            // Check if Touch ID has expired (time-based or restart-based)
            this.touchIdExpired = this.platform.isTouchIdExpired()

            // Auto-trigger Touch ID if available and not expired
            if (!this.touchIdExpired) {
                await this.unlockWithTouchId()
            }
        }

        setTimeout(() => {
            this.input.nativeElement?.focus()
        })
    }

    async unlockWithTouchId (): Promise<void> {
        this.touchIdError = ''
        try {
            await this.platform.promptBiometricAuth(this.translate.instant('Unlock Tabby Vault'))
            const passphrase = await this.platform.secureRetrievePassphrase()
            if (passphrase) {
                this.modalInstance.close({
                    passphrase,
                    rememberFor: this.rememberFor,
                    usedTouchId: true,
                })
            } else {
                this.touchIdError = this.translate.instant('Could not retrieve passphrase')
                // Hide Touch ID button since the stored passphrase seems invalid
                this.touchIdEnabled = false
            }
        } catch (e: any) {
            // User cancelled or Touch ID failed
            this.touchIdError = e.message || this.translate.instant('Touch ID failed')
        }
    }

    ok (): void {
        window.localStorage.vaultRememberPassphraseFor = this.rememberFor
        this.modalInstance.close({
            passphrase: this.passphrase,
            rememberFor: this.rememberFor,
            usedTouchId: false,
            // Update Touch ID storage when enabled (both when expired and to refresh timestamp)
            updateTouchId: this.touchIdEnabled,
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
