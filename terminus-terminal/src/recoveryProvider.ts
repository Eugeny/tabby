import { Injectable } from '@angular/core'
import { TabRecoveryProvider, AppService } from 'terminus-core'

import { TerminalTabComponent } from './components/terminalTab.component'
import { SessionsService } from './services/sessions.service'

@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    constructor (
        private sessions: SessionsService,
        private app: AppService,
    ) {
        super()
    }

    async recover (recoveryToken: any): Promise<void> {
        if (recoveryToken.type === 'app:terminal') {
            let session = await this.sessions.recover(recoveryToken.recoveryId)
            if (!session) {
                return
            }
            this.app.openNewTab(TerminalTabComponent, { session })
        }
    }
}
