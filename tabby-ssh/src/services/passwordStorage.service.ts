import * as keytar from 'keytar'
import { Injectable } from '@angular/core'
import { VaultService } from 'tabby-core'
import { SSHProfile } from '../api'

export const VAULT_SECRET_TYPE_PASSWORD = 'ssh:password'
export const VAULT_SECRET_TYPE_PASSPHRASE = 'ssh:key-passphrase'
export const VAULT_SECRET_TYPE_SUDO_PASSWORD = 'ssh:sudo-password'

// Keychain entries are keyed by connection plus account; use a reserved account
// for the sudo password so it cannot collide with a real login account.
const SUDO_PASSWORD_ACCOUNT = 'tabby-sudo-password'

@Injectable({ providedIn: 'root' })
export class PasswordStorageService {
    constructor (private vault: VaultService) { }

    async savePassword (profile: SSHProfile, password: string, username?: string): Promise<void> {
        const account = username ?? profile.options.user
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(profile, account)
            this.vault.addSecret({ type: VAULT_SECRET_TYPE_PASSWORD, key, value: password })
        } else {
            if (!account) {
                return
            }
            const key = this.getKeytarKeyForConnection(profile)
            return keytar.setPassword(key, account, password)
        }
    }

    async deletePassword (profile: SSHProfile, username?: string): Promise<void> {
        const account = username ?? profile.options.user
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(profile, account)
            this.vault.removeSecret(VAULT_SECRET_TYPE_PASSWORD, key)
        } else {
            if (!account) {
                return
            }
            const key = this.getKeytarKeyForConnection(profile)
            await keytar.deletePassword(key, account)
        }
    }

    async loadPassword (profile: SSHProfile, username?: string): Promise<string|null> {
        const account = username ?? profile.options.user
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(profile, account)
            return (await this.vault.getSecret(VAULT_SECRET_TYPE_PASSWORD, key))?.value ?? null
        } else {
            if (!account) {
                return null
            }
            const key = this.getKeytarKeyForConnection(profile)
            try {
                return await keytar.getPassword(key, account)
            } catch (e) {
                console.warn(`Failed to load stored password for ${account}@${profile.options.host}:${profile.options.port ?? 22}`, e)
                return null
            }
        }
    }

    async saveSudoPassword (profile: SSHProfile, password: string): Promise<void> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(profile, SUDO_PASSWORD_ACCOUNT)
            this.vault.addSecret({ type: VAULT_SECRET_TYPE_SUDO_PASSWORD, key, value: password })
        } else {
            await keytar.setPassword(this.getKeytarKeyForConnection(profile), SUDO_PASSWORD_ACCOUNT, password)
        }
    }

    async deleteSudoPassword (profile: SSHProfile): Promise<void> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(profile, SUDO_PASSWORD_ACCOUNT)
            this.vault.removeSecret(VAULT_SECRET_TYPE_SUDO_PASSWORD, key)
        } else {
            await keytar.deletePassword(this.getKeytarKeyForConnection(profile), SUDO_PASSWORD_ACCOUNT)
        }
    }

    async loadSudoPassword (profile: SSHProfile): Promise<string|null> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(profile, SUDO_PASSWORD_ACCOUNT)
            return (await this.vault.getSecret(VAULT_SECRET_TYPE_SUDO_PASSWORD, key))?.value ?? null
        }
        try {
            return await keytar.getPassword(this.getKeytarKeyForConnection(profile), SUDO_PASSWORD_ACCOUNT)
        } catch (e) {
            console.warn(`Failed to load stored sudo password for ${profile.options.host}:${profile.options.port ?? 22}`, e)
            return null
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

    private getVaultKeyForConnection (profile: SSHProfile, username?: string) {
        return {
            user: username ?? profile.options.user,
            host: profile.options.host,
            port: profile.options.port,
        }
    }

    private getVaultKeyForPrivateKey (id: string) {
        return { hash: id }
    }
}
