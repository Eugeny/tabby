import { Tab, ComponentType } from 'api/tab'
import { TerminalTabComponent } from './components/terminalTab'
import { Session } from './services/sessions'


export class TerminalTab extends Tab {
    static recoveryId = 'app:terminal'

    constructor (public session: Session) {
        super()
    }

    getComponentType (): ComponentType<TerminalTab> {
        return TerminalTabComponent
    }

    getRecoveryToken (): any {
        return {
            type: 'app:terminal',
            recoveryId: this.session.recoveryId,
        }
    }

    destroy (): void {
        this.session.gracefullyDestroy()
    }
}
