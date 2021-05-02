import { Injectable } from '@angular/core'
import { SSHConnection } from '../api'
import * as keytar from 'keytar'

@Injectable({ providedIn: 'root' })
export class PasswordStorageService {
    async savePassword (connection: SSHConnection, password: string): Promise<void> {
        const key = this.getKeyForConnection(connection)
        return keytar.setPassword(key, connection.user, password)
    }

    async deletePassword (connection: SSHConnection): Promise<void> {
        const key = this.getKeyForConnection(connection)
        await keytar.deletePassword(key, connection.user)
    }

    async loadPassword (connection: SSHConnection): Promise<string|null> {
        const key = this.getKeyForConnection(connection)
        return keytar.getPassword(key, connection.user)
    }

    async savePrivateKeyPassword (id: string, password: string): Promise<void> {
        const key = this.getKeyForPrivateKey(id)
        return keytar.setPassword(key, 'user', password)
    }

    async deletePrivateKeyPassword (id: string): Promise<void> {
        const key = this.getKeyForPrivateKey(id)
        await keytar.deletePassword(key, 'user')
    }

    async loadPrivateKeyPassword (id: string): Promise<string|null> {
        const key = this.getKeyForPrivateKey(id)
        return keytar.getPassword(key, 'user')
    }

    private getKeyForConnection (connection: SSHConnection): string {
        let key = `ssh@${connection.host}`
        if (connection.port) {
            key = `ssh@${connection.host}:${connection.port}`
        }
        return key
    }

    private getKeyForPrivateKey (id: string): string {
        return `ssh-private-key:${id}`
    }
}
