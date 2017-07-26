import { Injectable } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab } from 'terminus-core'

import { TerminalTabComponent } from './components/terminalTab.component'
import { SessionsService } from './services/sessions.service'

@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    constructor (
        private sessions: SessionsService,
    ) {
        super()
    }

    async recover (recoveryToken: any): Promise<RecoveredTab> {
        if (recoveryToken.type === 'app:terminal') {
            let sessionOptions = await this.sessions.recover(recoveryToken.recoveryId)
            if (!sessionOptions) {
                return null
            }
            return {
                type: TerminalTabComponent,
                options: { sessionOptions },
            }
        }
        return null
    }
}
