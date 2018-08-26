import { Injectable } from '@angular/core'
import { ConfigService } from 'terminus-core'
import { Frontend } from '../frontends/frontend'
import { HTermFrontend } from '../frontends/htermFrontend'
import { XTermFrontend } from '../frontends/xtermFrontend'
import { BaseSession } from '../services/sessions.service'

@Injectable()
export class TerminalFrontendService {
    private containers = new WeakMap<BaseSession, Frontend>()

    constructor (private config: ConfigService) { }

    getFrontend (session: BaseSession): Frontend {
        if (!this.containers.has(session)) {
            this.containers.set(
                session,
                (this.config.store.terminal.frontend === 'xterm')
                    ? new XTermFrontend()
                    : new HTermFrontend()
            )
        }
        return this.containers.get(session)
    }
}
