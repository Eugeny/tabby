import * as keytar from 'keytar'
import { Injectable } from '@angular/core'
import { ConfigService, VaultService } from 'tabby-core'
import { SavedCredential, SSHProfile } from '../api'
import deepClone from 'clone-deep'

const VAULT_SECRET_TYPE_CREDENTIAL_PASSWORD = 'ssh:credential-password'
const VAULT_SECRET_TYPE_CREDENTIAL_KEY_PASSPHRASE = 'ssh:credential-key-passphrase'

@Injectable({ providedIn: 'root' })
export class CredentialService {
    constructor (
        private config: ConfigService,
        private vault: VaultService,
    ) { }

    getCredentials (): SavedCredential[] {
        return this.config.store.ssh.savedCredentials ?? []
    }

    async upsertCredential (credential: SavedCredential): Promise<void> {
        const list = this.getCredentials()
        const existing = list.findIndex(x => x.id === credential.id)
        if (existing >= 0) {
            list[existing] = credential
        } else {
            list.push(credential)
        }
        this.config.store.ssh.savedCredentials = list
        await this.config.save()
    }

    async deleteCredential (credential: SavedCredential): Promise<void> {
        this.config.store.ssh.savedCredentials = this.getCredentials().filter(x => x.id !== credential.id)
        await this.deletePassword(credential.id)
        await this.config.save()
    }

    private vaultKey (credentialId: string) {
        return { credentialId }
    }

    async savePassword (credentialId: string, password: string): Promise<void> {
        if (this.vault.isEnabled()) {
            this.vault.addSecret({ type: VAULT_SECRET_TYPE_CREDENTIAL_PASSWORD, key: this.vaultKey(credentialId), value: password })
        } else {
            await keytar.setPassword(`ssh-credential:${credentialId}`, 'user', password)
        }
    }

    async loadPassword (credentialId: string): Promise<string|null> {
        if (this.vault.isEnabled()) {
            return (await this.vault.getSecret(VAULT_SECRET_TYPE_CREDENTIAL_PASSWORD, this.vaultKey(credentialId)))?.value ?? null
        } else {
            try {
                return await keytar.getPassword(`ssh-credential:${credentialId}`, 'user')
            } catch {
                return null
            }
        }
    }

    async deletePassword (credentialId: string): Promise<void> {
        if (this.vault.isEnabled()) {
            this.vault.removeSecret(VAULT_SECRET_TYPE_CREDENTIAL_PASSWORD, this.vaultKey(credentialId))
        } else {
            await keytar.deletePassword(`ssh-credential:${credentialId}`, 'user').catch(() => null)
        }
    }

    private vaultKeyPassphrase (credentialId: string) {
        return { credentialId: `passphrase:${credentialId}` }
    }

    async savePrivateKeyPassphrase (credentialId: string, passphrase: string): Promise<void> {
        if (this.vault.isEnabled()) {
            this.vault.addSecret({ type: VAULT_SECRET_TYPE_CREDENTIAL_KEY_PASSPHRASE, key: this.vaultKeyPassphrase(credentialId), value: passphrase })
        } else {
            await keytar.setPassword(`ssh-credential-passphrase:${credentialId}`, 'user', passphrase)
        }
    }

    async loadPrivateKeyPassphrase (credentialId: string): Promise<string|null> {
        if (this.vault.isEnabled()) {
            return (await this.vault.getSecret(VAULT_SECRET_TYPE_CREDENTIAL_KEY_PASSPHRASE, this.vaultKeyPassphrase(credentialId)))?.value ?? null
        } else {
            try {
                return await keytar.getPassword(`ssh-credential-passphrase:${credentialId}`, 'user')
            } catch {
                return null
            }
        }
    }

    async deletePrivateKeyPassphrase (credentialId: string): Promise<void> {
        if (this.vault.isEnabled()) {
            this.vault.removeSecret(VAULT_SECRET_TYPE_CREDENTIAL_KEY_PASSPHRASE, this.vaultKeyPassphrase(credentialId))
        } else {
            await keytar.deletePassword(`ssh-credential-passphrase:${credentialId}`, 'user').catch(() => null)
        }
    }

    async resolveProfile (profile: SSHProfile, groupCredentialId?: string): Promise<SSHProfile> {
        const credentialId = profile.options.credentialId ?? groupCredentialId
        if (!credentialId) {
            return profile
        }
        const credential = this.getCredentials().find(x => x.id === credentialId)
        if (!credential) {
            return profile
        }
        const resolved: SSHProfile = deepClone(profile)
        if (credential.username) {
            resolved.options.user = credential.username
        }
        if (credential.privateKeys.length && resolved.options.privateKeys.length === 0) {
            resolved.options.privateKeys = [...credential.privateKeys]
        }
        const password = await this.loadPassword(credentialId)
        if (password) {
            resolved.options.password = password
        }
        let keyPassphrase: string | null = null
        if (credential.usePasswordAsKeyPassphrase) {
            keyPassphrase = password
        } else {
            keyPassphrase = await this.loadPrivateKeyPassphrase(credentialId)
        }
        if (keyPassphrase) {
            resolved.options.privateKeyPassphrase = keyPassphrase
        }
        return resolved
    }
}
