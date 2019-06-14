import { Injectable } from '@angular/core'
import { ConfigService, ThemesService, HotkeysService } from 'terminus-core'
import { Frontend } from '../frontends/frontend'
import { HTermFrontend } from '../frontends/htermFrontend'
import { XTermFrontend, XTermWebGLFrontend } from '../frontends/xtermFrontend'
import { BaseSession } from '../services/sessions.service'

@Injectable({ providedIn: 'root' })
export class TerminalFrontendService {
    private containers = new WeakMap<BaseSession, Frontend>()

    /** @hidden */
    constructor (
        private config: ConfigService,
        private themes: ThemesService,
        private hotkeys: HotkeysService,
    ) { }

    getFrontend (session?: BaseSession): Frontend {
        if (!session) {
            const frontend: Frontend = new {
                xterm: XTermFrontend,
                'xterm-webgl': XTermWebGLFrontend,
                hterm: HTermFrontend,
            }[this.config.store.terminal.frontend]()
            frontend.configService = this.config
            frontend.themesService = this.themes
            frontend.hotkeysService = this.hotkeys
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
