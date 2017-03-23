import { Tab, ComponentType } from '../models/tab'
import { TerminalTabComponent } from './components/terminalTab'
import { Session } from './services/sessions'


export class TerminalTab extends Tab {
    constructor (public session: Session) {
        super()
    }

    getComponentType (): ComponentType<TerminalTab> {
        return TerminalTabComponent
    }
}
