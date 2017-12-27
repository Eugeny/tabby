import { Injectable, NgZone } from '@angular/core'
import { SSHConnection } from '../api'

let xkeychain
let wincredmgr
try {
    xkeychain = require('xkeychain')
} catch (error) {
    try {
        wincredmgr = require('wincredmgr')
    } catch (error2) {
        console.warn('No keychain manager available')
    }
}

@Injectable()
export class PasswordStorageService {
    constructor (
        private zone: NgZone,
    ) { }

    savePassword (connection: SSHConnection, password: string) {
        if (xkeychain) {
            xkeychain.setPassword({
                account: connection.user,
                service: `ssh@${connection.host}`,
                password
            }, () => null)
        } else {
            wincredmgr.WriteCredentials(
                'user',
                password,
                `ssh:${connection.user}@${connection.host}`,
            )
        }
    }

    deletePassword (connection: SSHConnection) {
        if (xkeychain) {
            xkeychain.deletePassword({
                account: connection.user,
                service: `ssh@${connection.host}`,
            }, () => null)
        } else {
            wincredmgr.DeleteCredentials(
                `ssh:${connection.user}@${connection.host}`,
            )
        }
    }

    loadPassword (connection: SSHConnection): Promise<string> {
        return new Promise(resolve => {
            if (!wincredmgr && !xkeychain.isSupported()) {
                return resolve(null)
            }
            if (xkeychain) {
                xkeychain.getPassword(
                    {
                        account: connection.user,
                        service: `ssh@${connection.host}`,
                    },
                    (_, result) => this.zone.run(() => resolve(result))
                )
            } else {
                try {
                    resolve(wincredmgr.ReadCredentials(`ssh:${connection.user}@${connection.host}`).password)
                } catch (error) {
                    resolve(null)
                }
            }
        })
    }
}
