import { Injectable } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab } from 'terminus-core'

import { TerminalTabComponent } from './components/terminalTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    async recover (recoveryToken: any): Promise<RecoveredTab|null> {
        if (recoveryToken && recoveryToken.type === 'app:terminal-tab') {
            return {
                type: TerminalTabComponent,
                options: { sessionOptions: recoveryToken.sessionOptions },
            }
        }
        return null
    }
}
