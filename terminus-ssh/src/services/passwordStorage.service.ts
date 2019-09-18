import { Injectable } from '@angular/core'
import { SSHConnection } from '../api'
import * as keytar from 'keytar'

@Injectable({ providedIn: 'root' })
export class PasswordStorageService {
    async savePassword (connection: SSHConnection, password: string): Promise<void> {
        return keytar.setPassword(`ssh@${connection.host}`, connection.user, password)
    }

    async deletePassword (connection: SSHConnection): Promise<void> {
        await keytar.deletePassword(`ssh@${connection.host}`, connection.user)
    }

    async loadPassword (connection: SSHConnection): Promise<string|null> {
        return keytar.getPassword(`ssh@${connection.host}`, connection.user)
    }
}
