import * as os from 'os'
import { Injectable } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { PlatformService } from '../api/platform'

export interface VaultBiometricsSettings {
    enabled: boolean
    /** Days after which the passphrase has to be entered again */
    expireDays: number
    /** Whether the passphrase has to be entered again after the computer restarts */
    expireOnRestart: boolean
}

interface StoredPassphrase {
    /** Encrypted with {@link PlatformService.encryptSecret} */
    encrypted: string
    /** When the user entered the passphrase */
    enteredAt: number
    /** When the computer booted, as of {@link enteredAt} */
    bootTime: number
}

interface VaultBiometricsState extends VaultBiometricsSettings {
    passphrase?: StoredPassphrase
}

const STORAGE_KEY = 'vaultBiometrics'
const MAX_EXPIRE_DAYS = 30
const DAY = 24 * 60 * 60 * 1000
// Allows for clock adjustments - a restart moves the boot time much further
const BOOT_TIME_TOLERANCE = 60 * 1000

function getBootTime (): number {
    return Date.now() - os.uptime() * 1000
}

function clampExpireDays (days: number): number {
    return Math.max(1, Math.min(MAX_EXPIRE_DAYS, Math.floor(days || 1)))
}

/**
 * Keeps the vault passphrase encrypted by the OS so that the vault can be unlocked with Touch ID,
 * until the passphrase has to be entered again
 */
@Injectable({ providedIn: 'root' })
export class VaultBiometricsService {
    /** @hidden */
    private constructor (
        private platform: PlatformService,
        private translate: TranslateService,
    ) { }

    async isAvailable (): Promise<boolean> {
        return this.platform.isBiometricAuthAvailable()
    }

    getSettings (): VaultBiometricsSettings {
        const { enabled, expireDays, expireOnRestart } = this.load()
        return { enabled, expireDays, expireOnRestart }
    }

    setExpiry (expireDays: number, expireOnRestart: boolean): void {
        this.save({ ...this.load(), expireDays: clampExpireDays(expireDays), expireOnRestart })
    }

    /**
     * Whether the vault can be unlocked with Touch ID now. Discards the stored passphrase once it has expired.
     */
    canUnlock (): boolean {
        const state = this.load()
        if (!state.enabled || !state.passphrase) {
            return false
        }
        if (this.isExpired(state.passphrase, state)) {
            this.forgetPassphrase()
            return false
        }
        return true
    }

    /**
     * Asks for Touch ID and returns the stored passphrase
     */
    async unlock (): Promise<string> {
        if (!this.canUnlock()) {
            throw new Error('Touch ID unlock is not available')
        }
        const { encrypted } = this.load().passphrase!
        await this.platform.promptBiometricAuth(this.translate.instant('unlock the vault'))
        try {
            return await this.platform.decryptSecret(encrypted)
        } catch (error) {
            console.warn('Could not decrypt the passphrase stored for Touch ID:', error)
            this.forgetPassphrase()
            throw new Error(this.translate.instant('Could not retrieve passphrase'))
        }
    }

    /**
     * Turns Touch ID unlock on once the user confirms with Touch ID
     */
    async enable (passphrase: string): Promise<void> {
        await this.platform.promptBiometricAuth(this.translate.instant('enable Touch ID for the vault'))
        const stored = await this.encryptPassphrase(passphrase)
        this.save({ ...this.load(), enabled: true, passphrase: stored })
    }

    disable (): void {
        this.save({ ...this.load(), enabled: false, passphrase: undefined })
    }

    /**
     * Keeps a passphrase that the user has entered, which restarts the expiry period.
     * Does nothing unless Touch ID unlock is enabled.
     */
    async storePassphrase (passphrase: string): Promise<void> {
        if (!this.load().enabled) {
            return
        }
        const stored = await this.encryptPassphrase(passphrase).catch(error => {
            // Discard the previous passphrase anyway, it may be outdated
            console.warn('Could not store the passphrase for Touch ID:', error)
            return undefined
        })
        const state = this.load()
        // Touch ID unlock might have been disabled in the meantime
        if (state.enabled) {
            this.save({ ...state, passphrase: stored })
        }
    }

    /**
     * Discards the stored passphrase so that it has to be entered again
     */
    forgetPassphrase (): void {
        this.save({ ...this.load(), passphrase: undefined })
    }

    private isExpired (passphrase: StoredPassphrase, settings: VaultBiometricsSettings): boolean {
        const age = Date.now() - passphrase.enteredAt
        if (age < 0 || age > settings.expireDays * DAY) {
            return true
        }
        return settings.expireOnRestart && Math.abs(getBootTime() - passphrase.bootTime) > BOOT_TIME_TOLERANCE
    }

    private async encryptPassphrase (passphrase: string): Promise<StoredPassphrase> {
        return {
            encrypted: await this.platform.encryptSecret(passphrase),
            enteredAt: Date.now(),
            bootTime: getBootTime(),
        }
    }

    private load (): VaultBiometricsState {
        let state: Partial<VaultBiometricsState> = {}
        try {
            state = JSON.parse(window.localStorage[STORAGE_KEY] ?? '{}')
        } catch { }
        return {
            enabled: state.enabled ?? false,
            expireDays: clampExpireDays(state.expireDays ?? 1),
            expireOnRestart: state.expireOnRestart ?? false,
            passphrase: state.passphrase,
        }
    }

    private save (state: VaultBiometricsState): void {
        window.localStorage[STORAGE_KEY] = JSON.stringify(state)
    }
}
