/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { BaseComponent, VaultService, VaultSecret, Vault, PlatformService, ConfigService, VAULT_SECRET_TYPE_FILE } from 'tabby-core'
import { SetVaultPassphraseModalComponent } from './setVaultPassphraseModal.component'


/** @hidden */
@Component({
    selector: 'vault-settings-tab',
    template: require('./vaultSettingsTab.component.pug'),
})
export class VaultSettingsTabComponent extends BaseComponent {
    vaultContents: Vault|null = null

    constructor (
        public vault: VaultService,
        public config: ConfigService,
        private platform: PlatformService,
        private ngbModal: NgbModal,
    ) {
        super()
        if (vault.isOpen()) {
            this.loadVault()
        }
    }

    async loadVault (): Promise<void> {
        this.vaultContents = await this.vault.load()
    }

    async enableVault () {
        const modal = this.ngbModal.open(SetVaultPassphraseModalComponent)
        const newPassphrase = await modal.result
        await this.vault.setEnabled(true, newPassphrase)
        this.vaultContents = await this.vault.load(newPassphrase)
    }

    async disableVault () {
        if ((await this.platform.showMessageBox(
            {
                type: 'warning',
                message: 'Delete vault contents?',
                buttons: ['Keep', 'Delete'],
                defaultId: 1,
            }
        )).response === 1) {
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
        const newPassphrase = await modal.result
        this.vault.save(this.vaultContents, newPassphrase)
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
            return `SSH password for ${secret.key.user}@${secret.key.host}:${secret.key.port}`
        }
        if (secret.type === 'ssh:key-passphrase') {
            return `Passphrase for a private key with hash ${secret.key.hash.substring(0, 8)}...`
        }
        if (secret.type === VAULT_SECRET_TYPE_FILE) {
            return `File: ${secret.key.description}`
        }
        return `Unknown secret of type ${secret.type} for ${JSON.stringify(secret.key)}`
    }

    removeSecret (secret: VaultSecret) {
        if (!this.vaultContents) {
            return
        }
        this.vaultContents.secrets = this.vaultContents.secrets.filter(x => x !== secret)
        this.vault.removeSecret(secret.type, secret.key)
    }
}
