import { Injectable } from '@angular/core'
import { ConfigService } from 'terminus-core'
import { TermContainer } from '../terminalContainers/termContainer'
import { HTermContainer } from '../terminalContainers/htermContainer'
import { XTermContainer } from '../terminalContainers/xtermContainer'
import { BaseSession } from '../services/sessions.service'

@Injectable()
export class TerminalContainersService {
    private containers = new WeakMap<BaseSession, TermContainer>()

    constructor (private config: ConfigService) { }

    getContainer (session: BaseSession): TermContainer {
        if (!this.containers.has(session)) {
            this.containers.set(
                session,
                (this.config.store.terminal.frontend === 'xterm')
                    ? new XTermContainer()
                    : new HTermContainer()
            )
        }
        return this.containers.get(session)
    }
}
