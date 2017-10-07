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
        return [{
            id: 'custom',
            name: 'Custom',
            command: this.config.store.terminal.customShell
        }]
    }
}
