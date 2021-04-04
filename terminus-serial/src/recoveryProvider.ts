import { Injectable } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab, RecoveryToken } from 'terminus-core'

import { SerialTabComponent } from './components/serialTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:serial-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<RecoveredTab> {
        return {
            type: SerialTabComponent,
            options: {
                connection: recoveryToken.connection,
                savedState: recoveryToken.savedState,
            },
        }
    }
}
