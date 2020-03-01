import { Injectable } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab, RecoveryToken } from 'terminus-core'

import { SerialTabComponent } from './components/serialTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    async recover (recoveryToken: RecoveryToken): Promise<RecoveredTab|null> {
        if (recoveryToken?.type === 'app:serial-tab') {
            return {
                type: SerialTabComponent,
                options: {
                    connection: recoveryToken['connection'],
                    savedState: recoveryToken['savedState'],
                },
            }
        }
        return null
    }
}
