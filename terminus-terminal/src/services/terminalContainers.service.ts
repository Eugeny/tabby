import { Injectable } from '@angular/core'
import { TermContainer } from '../terminalContainers/termContainer'
import { HTermContainer } from '../terminalContainers/htermContainer'
import { BaseSession } from '../services/sessions.service'

@Injectable()
export class TerminalContainersService {
    private containers = new WeakMap<BaseSession, TermContainer>()

    getContainer (session: BaseSession): TermContainer {
        if (!this.containers.has(session)) {
            this.containers.set(session, new HTermContainer())
        }
        return this.containers.get(session)
    }
}
