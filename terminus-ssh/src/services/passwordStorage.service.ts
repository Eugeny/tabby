import * as keytar from 'keytar'
import { Injectable } from '@angular/core'
import { SSHConnection } from '../api'
import { VaultService } from 'terminus-core'

export const VAULT_SECRET_TYPE_PASSWORD = 'ssh:password'
export const VAULT_SECRET_TYPE_PASSPHRASE = 'ssh:key-passphrase'

@Injectable({ providedIn: 'root' })
export class PasswordStorageService {
    constructor (private vault: VaultService) { }

    async savePassword (connection: SSHConnection, password: string): Promise<void> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(connection)
            this.vault.addSecret({ type: VAULT_SECRET_TYPE_PASSWORD, key, value: password })
        } else {
            const key = this.getKeytarKeyForConnection(connection)
            return keytar.setPassword(key, connection.user, password)
        }
    }

    async deletePassword (connection: SSHConnection): Promise<void> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(connection)
            this.vault.removeSecret(VAULT_SECRET_TYPE_PASSWORD, key)
        } else {
            const key = this.getKeytarKeyForConnection(connection)
            await keytar.deletePassword(key, connection.user)
        }
    }

    async loadPassword (connection: SSHConnection): Promise<string|null> {
        if (this.vault.isEnabled()) {
            const key = this.getVaultKeyForConnection(connection)
            return (await this.vault.getSecret(VAULT_SECRET_TYPE_PASSWORD, key))?.value ?? null
        } else {
            const key = this.getKeytarKeyForConnection(connection)
            return keytar.getPassword(key, connection.user)
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

    private getKeytarKeyForConnection (connection: SSHConnection): string {
        let key = `ssh@${connection.host}`
        if (connection.port) {
            key = `ssh@${connection.host}:${connection.port}`
        }
        return key
    }

    private getKeytarKeyForPrivateKey (id: string): string {
        return `ssh-private-key:${id}`
    }

    private getVaultKeyForConnection (connection: SSHConnection) {
        return {
            user: connection.user,
            host: connection.host,
            port: connection.port,
        }
    }

    private getVaultKeyForPrivateKey (id: string) {
        return { hash: id }
    }
}
