import { Injectable } from '@angular/core'
import { ConfigService } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

@Injectable()
export class CustomShellProvider extends ShellProvider {
    constructor (
        private config: ConfigService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {
        let args = this.config.store.terminal.customShell.split(' ')
        return [{
            id: 'custom',
            name: 'Custom shell',
            command: args[0],
            args: args.slice(1),
        }]
    }
}
