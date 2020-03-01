import { Injectable } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab, RecoveryToken } from 'terminus-core'

import { TerminalTabComponent } from './components/terminalTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    async recover (recoveryToken: RecoveryToken): Promise<RecoveredTab|null> {
        if (recoveryToken?.type === 'app:terminal-tab') {
            return {
                type: TerminalTabComponent,
                options: {
                    sessionOptions: recoveryToken['sessionOptions'],
                    savedState: recoveryToken['savedState'],
                },
            }
        }
        return null
    }
}
