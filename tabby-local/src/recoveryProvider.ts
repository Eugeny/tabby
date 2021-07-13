import { Injectable } from '@angular/core'
import { TabRecoveryProvider, NewTabParameters, RecoveryToken } from 'tabby-core'

import { TerminalTabComponent } from './components/terminalTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider<TerminalTabComponent> {
    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:local-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<TerminalTabComponent>> {
        return {
            type: TerminalTabComponent,
            inputs: {
                profile: recoveryToken.profile,
                savedState: recoveryToken.savedState,
            },
        }
    }

    duplicate (recoveryToken: RecoveryToken): RecoveryToken {
        return {
            ...recoveryToken,
            profile: {
                ...recoveryToken.profile,
                options: {
                    ...recoveryToken.profile.options,
                    restoreFromPTYID: null,
                },
            },
            savedState: null,
        }
    }
}
