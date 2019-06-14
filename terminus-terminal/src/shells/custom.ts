import { Injectable } from '@angular/core'
import { ConfigService } from 'terminus-core'

import { ShellProvider } from '../api/shellProvider'
import { Shell } from '../api/interfaces'

/** @hidden */
@Injectable()
export class CustomShellProvider extends ShellProvider {
    constructor (
        private config: ConfigService,
    ) {
        super()
    }

    async provide (): Promise<Shell[]> {
        const args = this.config.store.terminal.customShell.split(' ')
        return [{
            id: 'custom',
            name: 'Custom shell',
            command: args[0],
            args: args.slice(1),
            env: {},
        }]
    }
}
