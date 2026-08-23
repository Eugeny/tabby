import { Component } from '@angular/core'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { v4 as uuidv4 } from 'uuid'
import { FileProvidersService, PromptModalComponent, TranslateService } from 'tabby-core'
import { CredentialService } from '../services/credential.service'
import { SavedCredential } from '../api'

/** @hidden */
@Component({
    templateUrl: './credentialEditorModal.component.pug',
})
export class CredentialEditorModalComponent {
    credential: SavedCredential = { id: '', name: '', username: '', privateKeys: [], usePasswordAsKeyPassphrase: false }
    hasSavedPassword = false
    hasSavedKeyPassphrase = false

    constructor (
        private credentials: CredentialService,
        private fileProviders: FileProvidersService,
        private ngbModal: NgbModal,
        private modal: NgbActiveModal,
        private translate: TranslateService,
    ) { }

    async ngOnInit (): Promise<void> {
        if (!this.credential.id) {
            this.credential.id = uuidv4()
        }
        this.hasSavedPassword = !!await this.credentials.loadPassword(this.credential.id)
        this.hasSavedKeyPassphrase = !!await this.credentials.loadPrivateKeyPassphrase(this.credential.id)
        if (this.credential.usePasswordAsKeyPassphrase === undefined) {
            this.credential.usePasswordAsKeyPassphrase = false
        }
    }

    async addPrivateKey (): Promise<void> {
        const ref = await this.fileProviders.selectAndStoreFile(`private key for ${this.credential.name || 'credential'}`).catch(() => null)
        if (ref) {
            this.credential.privateKeys = [...this.credential.privateKeys, ref]
        }
    }

    removePrivateKey (path: string): void {
        this.credential.privateKeys = this.credential.privateKeys.filter(x => x !== path)
    }

    async setPassword (): Promise<void> {
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = this.translate.instant('Password for {name}', { name: this.credential.username || this.credential.name })
        modal.componentInstance.password = true
        const result = await modal.result.catch(() => null)
        if (result?.value) {
            await this.credentials.savePassword(this.credential.id, result.value)
            this.hasSavedPassword = true
        }
    }

    async clearPassword (): Promise<void> {
        await this.credentials.deletePassword(this.credential.id)
        this.hasSavedPassword = false
    }

    async setPrivateKeyPassphrase (): Promise<void> {
        const modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = this.translate.instant('Private key passphrase for {name}', { name: this.credential.username || this.credential.name })
        modal.componentInstance.password = true
        const result = await modal.result.catch(() => null)
        if (result?.value) {
            await this.credentials.savePrivateKeyPassphrase(this.credential.id, result.value)
            this.hasSavedKeyPassphrase = true
        }
    }

    async clearPrivateKeyPassphrase (): Promise<void> {
        await this.credentials.deletePrivateKeyPassphrase(this.credential.id)
        this.hasSavedKeyPassphrase = false
    }

    async save (): Promise<void> {
        if (!this.credential.name.trim()) {
            return
        }
        await this.credentials.upsertCredential(this.credential)
        this.modal.close()
    }

    cancel (): void {
        this.modal.dismiss()
    }
}
