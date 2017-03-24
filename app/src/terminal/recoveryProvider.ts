import { Injectable } from '@angular/core'
import { Tab, ITabRecoveryProvider } from 'api'
import { TerminalTab } from './tab'
import { SessionsService } from './services/sessions'


@Injectable()
export class RecoveryProvider implements ITabRecoveryProvider {
    constructor (private sessions: SessionsService) { }

    recover (recoveryToken: any): Tab {
        if (recoveryToken.type == 'app:terminal') {
            const options = this.sessions.recoveryProvider.getRecoverySession(recoveryToken.recoveryId)
            let session = this.sessions.createSession(options)
            session.recoveryId = recoveryToken.recoveryId
            return new TerminalTab(session)
        }
        return null
    }
}
