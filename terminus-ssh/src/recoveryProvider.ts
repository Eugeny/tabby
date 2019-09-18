import { Injectable } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab } from 'terminus-core'

import { SSHTabComponent } from './components/sshTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    async recover (recoveryToken: any): Promise<RecoveredTab|null> {
        if (recoveryToken && recoveryToken.type === 'app:ssh-tab') {
            return {
                type: SSHTabComponent,
                options: { connection: recoveryToken.connection },
            }
        }
        return null
    }
}
