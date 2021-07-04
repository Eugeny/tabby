import { Injectable } from '@angular/core'
import { TabRecoveryProvider, NewTabParameters, RecoveryToken } from 'tabby-core'

import { SerialTabComponent } from './components/serialTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider<SerialTabComponent> {
    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:serial-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<SerialTabComponent>> {
        return {
            type: SerialTabComponent,
            inputs: {
                profile: recoveryToken.profile,
                savedState: recoveryToken.savedState,
            },
        }
    }
}
