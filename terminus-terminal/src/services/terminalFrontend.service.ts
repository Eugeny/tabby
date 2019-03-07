import { Injectable } from '@angular/core'
import { ConfigService, ThemesService } from 'terminus-core'
import { Frontend } from '../frontends/frontend'
import { HTermFrontend } from '../frontends/htermFrontend'
import { XTermFrontend } from '../frontends/xtermFrontend'
import { BaseSession } from '../services/sessions.service'

@Injectable({ providedIn: 'root' })
export class TerminalFrontendService {
    private containers = new WeakMap<BaseSession, Frontend>()

    /** @hidden */
    constructor (private config: ConfigService, private themes: ThemesService) { }

    getFrontend (session?: BaseSession): Frontend {
        if (!session) {
            let frontend: Frontend = (this.config.store.terminal.frontend === 'xterm')
                ? new XTermFrontend()
                : new HTermFrontend()
            frontend.configService = this.config
            frontend.themesService = this.themes
            return frontend
        }
        if (!this.containers.has(session)) {
            this.containers.set(
                session,
                this.getFrontend(),
            )
        }
        return this.containers.get(session)
    }
}
