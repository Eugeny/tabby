/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { BaseComponent, VaultService, VaultSecret, Vault, PlatformService, ConfigService, VAULT_SECRET_TYPE_FILE, PromptModalComponent, VaultFileSecret } from 'tabby-core'
import { SetVaultPassphraseModalComponent } from './setVaultPassphraseModal.component'


/** @hidden */
@Component({
    selector: 'vault-settings-tab',
    template: require('./vaultSettingsTab.component.pug'),
})
export class VaultSettingsTabComponent extends BaseComponent {
    vaultContents: Vault|null = null
    VAULT_SECRET_TYPE_FILE = VAULT_SECRET_TYPE_FILE

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
                buttons: ['Delete', 'Keep'],
                defaultId: 1,
                cancelId: 1,
            }
        )).response === 0) {
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
            return `SSH password for ${(secret as any).key.user}@${(secret as any).key.host}:${(secret as any).key.port}`
        }
        if (secret.type === 'ssh:key-passphrase') {
            return `Passphrase for a private key with hash ${(secret as any).key.hash.substring(0, 8)}...`
        }
        if (secret.type === VAULT_SECRET_TYPE_FILE) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            return `File: ${(secret as VaultFileSecret).key.description}`
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

    async replaceFileContent (secret: VaultFileSecret) {
        const transfers = await this.platform.startUpload()
        if (!transfers.length) {
            return
        }
        await this.vault.updateSecret(secret, {
            ...secret,
            value: (await transfers[0].readAll()).toString('base64'),
        })
        this.loadVault()
    }

    async renameFile (secret: VaultFileSecret) {
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = 'New name'
        modal.componentInstance.value = secret.key.description

        const description = (await modal.result)?.value
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
}
