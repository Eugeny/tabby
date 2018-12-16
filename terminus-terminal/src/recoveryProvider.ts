import { Injectable } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab } from 'terminus-core'

import { TerminalTabComponent } from './components/terminalTab.component'

@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    constructor (
        // private sessions: SessionsService,
    ) {
        super()
    }

    async recover (recoveryToken: any): Promise<RecoveredTab> {
        if (recoveryToken.type === 'app:terminal-tab') {
            return {
                type: TerminalTabComponent,
                options: { sessionOptions: recoveryToken.sessionOptions },
            }
        }
        return null
    }
}
