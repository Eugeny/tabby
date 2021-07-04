import { Injectable } from '@angular/core'
import { TabRecoveryProvider, NewTabParameters, RecoveryToken } from 'tabby-core'

import { SSHTabComponent } from './components/sshTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider<SSHTabComponent> {
    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:ssh-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<SSHTabComponent>> {
        return {
            type: SSHTabComponent,
            inputs: {
                profile: recoveryToken['profile'],
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
