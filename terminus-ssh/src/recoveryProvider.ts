import { Injectable } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab, RecoveryToken } from 'terminus-core'

import { SSHTabComponent } from './components/sshTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    async recover (recoveryToken: RecoveryToken): Promise<RecoveredTab|null> {
        if (recoveryToken?.type === 'app:ssh-tab') {
            return {
                type: SSHTabComponent,
                options: {
                    connection: recoveryToken['connection'],
                    savedState: recoveryToken['savedState'],
                },
            }
        }
        return null
    }
}
