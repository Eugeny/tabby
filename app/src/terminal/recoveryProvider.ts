import { Injectable } from '@angular/core'
import { Tab, TabRecoveryProvider } from 'api'
import { TerminalTab } from './tab'
import { SessionsService } from './services/sessions'


@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    constructor (private sessions: SessionsService) {
        super()
    }

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
