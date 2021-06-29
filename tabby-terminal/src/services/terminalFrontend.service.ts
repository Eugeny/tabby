import { Injectable, Injector } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { Frontend } from '../frontends/frontend'
import { HTermFrontend } from '../frontends/htermFrontend'
import { XTermFrontend, XTermWebGLFrontend } from '../frontends/xtermFrontend'
import { BaseSession } from '../session'

@Injectable({ providedIn: 'root' })
export class TerminalFrontendService {
    private containers = new WeakMap<BaseSession, Frontend>()

    /** @hidden */
    private constructor (
        private config: ConfigService,
        private injector: Injector,
    ) { }

    getFrontend (session?: BaseSession|null): Frontend {
        if (!session) {
            const frontend: Frontend = new {
                xterm: XTermFrontend,
                'xterm-webgl': XTermWebGLFrontend,
                hterm: HTermFrontend,
            }[this.config.store.terminal.frontend](this.injector)
            return frontend
        }
        if (!this.containers.has(session)) {
            this.containers.set(
                session,
                this.getFrontend(),
            )
        }
        return this.containers.get(session)!
    }
}
