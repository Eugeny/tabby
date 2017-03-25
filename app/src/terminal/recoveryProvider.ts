import { Injectable } from '@angular/core'
import { Tab, TabRecoveryProvider } from 'api'
import { TerminalTab } from './tab'
import { SessionsService } from './services/sessions'


@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    constructor (private sessions: SessionsService) {
        super()
    }

    async recover (recoveryToken: any): Promise<Tab> {
        if (recoveryToken.type == 'app:terminal') {
            let session = await this.sessions.recover(recoveryToken.recoveryId)
            if (!session) {
                return null
            }
            return new TerminalTab(session)
        }
        return null
    }
}
