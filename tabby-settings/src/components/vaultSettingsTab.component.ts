/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, HostBinding } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { BaseComponent, VaultService, VaultSecret, Vault, PlatformService, ConfigService, VAULT_SECRET_TYPE_FILE, PromptModalComponent, VaultFileSecret, TranslateService, NotificationsService } from 'tabby-core'
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
    searchTerm = ''

    // Touch ID support
    touchIdAvailable = false
    touchIdEnabled = false
    touchIdExpireDays = 1

    @HostBinding('class.content-box') true

    constructor (
        public vault: VaultService,
        public config: ConfigService,
        private platform: PlatformService,
        private ngbModal: NgbModal,
        private translate: TranslateService,
        private notifications: NotificationsService,
    ) {
        super()
        if (vault.isOpen()) {
            this.loadVault()
        }
        this.checkTouchIdAvailability()
    }

    async checkTouchIdAvailability (): Promise<void> {
        const biometricAvailable = await (this.platform.isBiometricAuthAvailable() as any)
        const secureStorageAvailable = await (this.platform.isSecureStorageAvailable() as any)
        this.touchIdAvailable = biometricAvailable && secureStorageAvailable

        let expireDays = this.platform.getTouchIdSettings().expireDays
        // Migration: ensure at least 1 day if previously set to 0 (for security)
        if (expireDays <= 0) {
            expireDays = 1
            await this.platform.setTouchIdSettings(true, 1, this.platform.getTouchIdSettings().expireOnRestart)
        }

        this.touchIdEnabled = this.platform.getTouchIdSettings().enabled
        this.touchIdExpireDays = expireDays
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
            this.touchIdEnabled = true
        } catch (e: any) {
            // User cancelled or Touch ID failed
            console.error('Failed to enable Touch ID:', e)
            this.notifications.error(this.translate.instant('Failed to enable Touch ID'), e.message || e.toString())

            // Force toggle back
            this.touchIdEnabled = true
            setTimeout(() => this.touchIdEnabled = false)
        }
    }

    async disableTouchId (): Promise<void> {
        const settings = this.platform.getTouchIdSettings()
        await this.platform.setTouchIdSettings(false, settings.expireDays, settings.expireOnRestart)
        await this.platform.secureDeletePassphrase()
        this.touchIdEnabled = false
    }

    async toggleTouchId (enabled: boolean): Promise<void> {
        if (enabled) {
            await this.enableTouchId()
        } else {
            await this.disableTouchId()
        }
    }

    async setTouchIdExpireDays (): Promise<void> {
        this.touchIdExpireDays = Math.max(1, Math.min(30, Math.floor(this.touchIdExpireDays || 1)))
        await this.platform.setTouchIdSettings(this.touchIdEnabled, this.touchIdExpireDays, this.touchIdExpireOnRestart)
    }

    async setTouchIdExpireOnRestart (value: boolean): Promise<void> {
        await this.platform.setTouchIdSettings(this.touchIdEnabled, this.touchIdExpireDays, value)
    }

    async loadVault (): Promise<void> {
        this.vaultContents = await this.vault.load()
    }

    get filteredSecrets (): VaultSecret[] {
        const term = this.searchTerm.toLowerCase()
        return this.vaultContents?.secrets.filter(
            secret => this.getSecretLabel(secret).toLowerCase().includes(term),
        ) ?? []
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
            await this.vault.save(this.vaultContents, newPassphrase)
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
        // A plugin's secret: listed by the description its key carries, when it has one
        if (typeof (secret.key as any).description === 'string' && (secret.key as any).description) {
            return (secret.key as any).description
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
