import { Injectable } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab, RecoveryToken } from 'tabby-core'

import { SSHTabComponent } from './components/sshTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:ssh-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<RecoveredTab> {
        return {
            type: SSHTabComponent,
            options: {
                connection: recoveryToken['connection'],
                savedState: recoveryToken['savedState'],
            },
        }
    }

    duplicate (recoveryToken: RecoveryToken): RecoveryToken {
        return {
            ...recoveryToken,
            savedState: null,
        }
    }
}
