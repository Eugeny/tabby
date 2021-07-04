import * as keytar from 'keytar'
import { Injectable } from '@angular/core'
import { SSHProfile } from '../api'
import { VaultService } from 'tabby-core'

export const VAULT_SECRET_TYPE_PASSWORD = 'ssh:password'
export const VAULT_SECRET_TYPE_PASSPHRASE = 'ssh:key-passphrase'

@Injectable({ providedIn: 'root' })
export class PasswordStorageService {
    constructor (private vault: VaultService) { }

    async savePassword (profile: SSHProfile, password: string): Promise<void> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(profile)
            this.vault.addSecret({ type: VAULT_SECRET_TYPE_PASSWORD, key, value: password })
        } else {
            const key = this.getKeytarKeyForConnection(profile)
            return keytar.setPassword(key, profile.options.user, password)
        }
    }

    async deletePassword (profile: SSHProfile): Promise<void> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(profile)
            this.vault.removeSecret(VAULT_SECRET_TYPE_PASSWORD, key)
        } else {
            const key = this.getKeytarKeyForConnection(profile)
            await keytar.deletePassword(key, profile.options.user)
        }
    }

    async loadPassword (profile: SSHProfile): Promise<string|null> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(profile)
            return (await this.vault.getSecret(VAULT_SECRET_TYPE_PASSWORD, key))?.value ?? null
        } else {
            const key = this.getKeytarKeyForConnection(profile)
            return keytar.getPassword(key, profile.options.user)
        }
    }

    async savePrivateKeyPassword (id: string, password: string): Promise<void> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForPrivateKey(id)
            this.vault.addSecret({ type: VAULT_SECRET_TYPE_PASSPHRASE, key, value: password })
        } else {
            const key = this.getKeytarKeyForPrivateKey(id)
            return keytar.setPassword(key, 'user', password)
        }
    }

    async deletePrivateKeyPassword (id: string): Promise<void> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForPrivateKey(id)
            this.vault.removeSecret(VAULT_SECRET_TYPE_PASSPHRASE, key)
        } else {
            const key = this.getKeytarKeyForPrivateKey(id)
            await keytar.deletePassword(key, 'user')
        }
    }

    async loadPrivateKeyPassword (id: string): Promise<string|null> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForPrivateKey(id)
            return (await this.vault.getSecret(VAULT_SECRET_TYPE_PASSPHRASE, key))?.value ?? null
        } else {
            const key = this.getKeytarKeyForPrivateKey(id)
            return keytar.getPassword(key, 'user')
        }
    }

    private getKeytarKeyForConnection (profile: SSHProfile): string {
        let key = `ssh@${profile.options.host}`
        if (profile.options.port) {
            key = `ssh@${profile.options.host}:${profile.options.port}`
        }
        return key
    }

    private getKeytarKeyForPrivateKey (id: string): string {
        return `ssh-private-key:${id}`
    }

    private getVaultKeyForConnection (profile: SSHProfile) {
        return {
            user: profile.options.user,
            host: profile.options.host,
            port: profile.options.port,
        }
    }

    private getVaultKeyForPrivateKey (id: string) {
        return { hash: id }
    }
}
