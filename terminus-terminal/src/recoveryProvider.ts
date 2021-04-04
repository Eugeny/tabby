import { Injectable } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab, RecoveryToken } from 'terminus-core'

import { TerminalTabComponent } from './components/terminalTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:terminal-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<RecoveredTab> {
        return {
            type: TerminalTabComponent,
            options: {
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
        }
    }
}
