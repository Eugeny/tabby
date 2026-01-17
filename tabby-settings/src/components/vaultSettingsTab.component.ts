/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, HostBinding } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { BaseComponent, VaultService, VaultSecret, Vault, PlatformService, ConfigService, VAULT_SECRET_TYPE_FILE, PromptModalComponent, VaultFileSecret, TranslateService } from 'tabby-core'
import { SetVaultPassphraseModalComponent } from './setVaultPassphraseModal.component'
import { ShowSecretModalComponent } from './showSecretModal.component'


/** @hidden */
@Component({
    selector: 'vault-settings-tab',
    templateUrl: './vaultSettingsTab.component.pug',
})
export class VaultSettingsTabComponent extends BaseComponent {
    vaultContents: Vault|null = null
    VAULT_SECRET_TYPE_FILE = VAULT_SECRET_TYPE_FILE

    // Touch ID support
    touchIdAvailable = false
    touchIdExpireOptions = [
        { value: 1, label: '1 day' },
        { value: 7, label: '7 days' },
        { value: 30, label: '30 days' },
        { value: 0, label: 'Never expire' },
    ]

    customExpireDays = 1

    @HostBinding('class.content-box') true

    constructor (
        public vault: VaultService,
        public config: ConfigService,
        private platform: PlatformService,
        private ngbModal: NgbModal,
        private translate: TranslateService,
    ) {
        super()
        if (vault.isOpen()) {
            this.loadVault()
        }
        this.checkTouchIdAvailability()
    }

    async checkTouchIdAvailability (): Promise<void> {
        const biometricAvailable = await this.platform.isBiometricAuthAvailable()
        const secureStorageAvailable = this.platform.isSecureStorageAvailable()
        this.touchIdAvailable = biometricAvailable && secureStorageAvailable
    }

    get touchIdEnabled (): boolean {
        return this.platform.getTouchIdSettings().enabled
    }

    get touchIdExpireDays (): number {
        return this.platform.getTouchIdSettings().expireDays
    }

    get touchIdExpireOnRestart (): boolean {
        return this.platform.getTouchIdSettings().expireOnRestart
    }

    async enableTouchId (): Promise<void> {
        try {
            // Prompt for Touch ID to confirm
            await this.platform.promptBiometricAuth(this.translate.instant('Enable Touch ID for Vault'))

            // Get the current passphrase and store it securely
            const passphrase = await this.vault.getPassphrase()
            await this.platform.secureStorePassphrase(passphrase)

            // Update settings in separate file (not affected by vault encryption)
            await this.platform.setTouchIdSettings(true, this.touchIdExpireDays)
        } catch (e: any) {
            // User cancelled or Touch ID failed
            console.error('Failed to enable Touch ID:', e)
        }
    }

    async disableTouchId (): Promise<void> {
        const settings = this.platform.getTouchIdSettings()
        await this.platform.setTouchIdSettings(false, settings.expireDays, settings.expireOnRestart)
        await this.platform.secureDeletePassphrase()
    }

    async toggleTouchId (): Promise<void> {
        if (this.touchIdEnabled) {
            await this.disableTouchId()
        } else {
            await this.enableTouchId()
        }
    }

    async setTouchIdExpireDays (days: number): Promise<void> {
        await this.platform.setTouchIdSettings(true, days, this.touchIdExpireOnRestart)
    }

    async setTouchIdExpireOnRestart (value: boolean): Promise<void> {
        await this.platform.setTouchIdSettings(true, this.touchIdExpireDays, value)
    }

    async setCustomExpireDays (days: number): Promise<void> {
        // Validate: max 30 days, min 1 day
        days = Math.max(1, Math.min(30, Math.floor(days)))
        this.customExpireDays = days
        await this.platform.setTouchIdSettings(true, days, this.touchIdExpireOnRestart)
    }

    async loadVault (): Promise<void> {
        this.vaultContents = await this.vault.load()
    }

    async enableVault () {
        const modal = this.ngbModal.open(SetVaultPassphraseModalComponent)
        const newPassphrase = await modal.result.catch(() => null)
        if (newPassphrase) {
            await this.vault.setEnabled(true, newPassphrase)
            this.vaultContents = await this.vault.load(newPassphrase)
        }
    }

    async disableVault () {
        if ((await this.platform.showMessageBox(
            {
                type: 'warning',
                message: this.translate.instant('Delete vault contents?'),
                buttons: [
                    this.translate.instant('Delete'),
                    this.translate.instant('Keep'),
                ],
                defaultId: 1,
                cancelId: 1,
            },
        )).response === 0) {
            // Also disable Touch ID when vault is disabled
            if (this.touchIdEnabled) {
                await this.disableTouchId()
            }
            await this.vault.setEnabled(false)
        }
    }

    async changePassphrase () {
        if (!this.vaultContents) {
            this.vaultContents = await this.vault.load()
        }
        if (!this.vaultContents) {
            return
        }
        const modal = this.ngbModal.open(SetVaultPassphraseModalComponent)
        const newPassphrase = await modal.result.catch(() => null)
        if (newPassphrase) {
            this.vault.save(this.vaultContents, newPassphrase)
            // Update Touch ID storage if enabled
            if (this.touchIdEnabled) {
                await this.platform.secureStorePassphrase(newPassphrase)
            }
        }
    }

    async toggleConfigEncrypted () {
        this.config.store.encrypted = !this.config.store.encrypted
        try {
            await this.config.save()
        } catch (e) {
            this.config.store.encrypted = !this.config.store.encrypted
            throw e
        }
    }

    getSecretLabel (secret: VaultSecret) {
        if (secret.type === 'ssh:password') {
            return this.translate.instant('SSH password for {user}@{host}:{port}', (secret as any).key)
        }
        if (secret.type === 'ssh:key-passphrase') {
            return this.translate.instant('Passphrase for a private key with hash {hash}...', { hash: (secret as any).key.hash.substring(0, 8) })
        }
        if (secret.type === VAULT_SECRET_TYPE_FILE) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            return this.translate.instant('File: {description}', (secret as VaultFileSecret).key)
        }
        return this.translate.instant('Unknown secret of type {type} for {key}', { type: secret.type, key: JSON.stringify(secret.key) })
    }

    showSecret (secret: VaultSecret) {
        if (!this.vaultContents) {
            return
        }
        const modal = this.ngbModal.open(ShowSecretModalComponent)
        modal.componentInstance.title = this.getSecretLabel(secret)
        modal.componentInstance.secret = secret

    }

    removeSecret (secret: VaultSecret) {
        if (!this.vaultContents) {
            return
        }
        this.vaultContents.secrets = this.vaultContents.secrets.filter(x => x !== secret)
        this.vault.removeSecret(secret.type, secret.key)
    }

    async replaceFileContent (secret: VaultFileSecret) {
        const transfers = await this.platform.startUpload()
        if (!transfers.length) {
            return
        }
        await this.vault.updateSecret(secret, {
            ...secret,
            value: Buffer.from(await transfers[0].readAll()).toString('base64'),
        })
        this.loadVault()
    }

    async renameFile (secret: VaultFileSecret) {
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = this.translate.instant('New name')
        modal.componentInstance.value = secret.key.description

        const description = (await modal.result.catch(() => null))?.value
        if (!description) {
            return
        }

        await this.vault.updateSecret(secret, {
            ...secret,
            key: {
                ...secret.key,
                description,
            },
        })

        this.loadVault()
    }

    async exportFile (secret: VaultFileSecret) {
        this.vault.forgetPassphrase()

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        secret = (await this.vault.getSecret(secret.type, secret.key)) as VaultFileSecret

        const content = Buffer.from(secret.value, 'base64')
        const download = await this.platform.startDownload(secret.key.description, 0o600, content.length)

        if (download) {
            await download.write(content)
            download.close()
        }
    }

    castAny = (x: any) => x
}
