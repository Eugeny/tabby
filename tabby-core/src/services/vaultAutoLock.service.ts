import { Injectable } from '@angular/core'
import { ConfigService } from './config.service'
import { VaultService } from './vault.service'

/**
 * Locks the vault after a configurable period of user inactivity.
 *
 * Locking only forgets the in-memory master passphrase: accessing stored
 * secrets (SSH passwords, private-key passphrases, files) or saving an
 * encrypted config will require it again. Already-open terminal sessions are
 * not affected.
 */
@Injectable({ providedIn: 'root' })
export class VaultAutoLockService {
    private minutes = 0
    private timer: ReturnType<typeof setTimeout>|null = null

    private constructor (
        private vault: VaultService,
        private config: ConfigService,
    ) {
        this.config.ready$.subscribe(() => this.configure())
        this.config.changed$.subscribe(() => this.configure())
    }

    /** Restarts the idle countdown. Call on user activity. */
    noteActivity (): void {
        if (this.minutes <= 0) {
            return
        }
        if (this.timer) {
            clearTimeout(this.timer)
        }
        this.timer = setTimeout(() => {
            this.timer = null
            if (this.vault.isEnabled() && this.vault.isOpen()) {
                this.vault.forgetPassphrase()
            }
        }, this.minutes * 60_000)
    }

    private configure (): void {
        if (!this.config.store) {
            return
        }
        const value = Number(this.config.store.vaultAutoLockMinutes)
        this.minutes = Number.isFinite(value) ? Math.max(0, value) : 0
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = null
        }
        this.noteActivity()
    }
}
