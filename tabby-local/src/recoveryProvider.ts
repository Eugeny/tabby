import { Injectable } from '@angular/core'
import { TabRecoveryProvider, NewTabParameters, RecoveryToken } from 'tabby-core'

import { TerminalTabComponent } from './components/terminalTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider<TerminalTabComponent> {
    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:terminal-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<TerminalTabComponent>> {
        return {
            type: TerminalTabComponent,
            inputs: {
                sessionOptions: recoveryToken.sessionOptions,
                savedState: recoveryToken.savedState,
            },
        }
    }

    duplicate (recoveryToken: RecoveryToken): RecoveryToken {
        return {
            ...recoveryToken,
            sessionOptions: {
                ...recoveryToken.sessionOptions,
                restoreFromPTYID: null,
            },
            savedState: null,
        }
    }
}
