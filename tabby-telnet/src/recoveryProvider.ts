import { Injectable } from '@angular/core'
import { TabRecoveryProvider, NewTabParameters, RecoveryToken } from 'tabby-core'

import { TelnetTabComponent } from './components/telnetTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider<TelnetTabComponent> {
    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:telnet-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<TelnetTabComponent>> {
        return {
            type: TelnetTabComponent,
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
