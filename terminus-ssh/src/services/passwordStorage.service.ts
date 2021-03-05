import { Injectable } from '@angular/core'
import { SSHConnection } from '../api'
import * as keytar from 'keytar'

@Injectable({ providedIn: 'root' })
export class PasswordStorageService {
    async savePassword (connection: SSHConnection, password: string): Promise<void> {
        let key = `ssh@${connection.host}`
        if (connection.port) {
            key = `ssh@${connection.host}:${connection.port}`
        }
        return keytar.setPassword(key, connection.user, password)
    }

    async deletePassword (connection: SSHConnection): Promise<void> {
        let key = `ssh@${connection.host}`
        if (connection.port) {
            key = `ssh@${connection.host}:${connection.port}`
        }
        await keytar.deletePassword(key, connection.user)
    }

    async loadPassword (connection: SSHConnection): Promise<string|null> {
        let key = `ssh@${connection.host}`
        if (connection.port) {
            key = `ssh@${connection.host}:${connection.port}`
        }
        return keytar.getPassword(key, connection.user)
    }
}
