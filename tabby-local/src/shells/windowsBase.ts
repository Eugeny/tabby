import { ConfigService, HostAppService } from 'tabby-core'

import { ShellProvider } from '../api'

export abstract class WindowsBaseShellProvider extends ShellProvider {
    constructor (
        protected hostApp: HostAppService,
        protected config: ConfigService,
    ) {
        super()
    }

    protected getEnvironment (): any {
        return {
            wt: {
                WT_SESSION: 0,
            },
            cygwin: {
                TERM: 'cygwin',
            },
        }[this.config.store.terminal.identification] ?? {}
    }
}
