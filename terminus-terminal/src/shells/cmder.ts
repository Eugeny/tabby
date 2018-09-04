import * as path from 'path'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

@Injectable()
export class CmderShellProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        if (!process.env.CMDER_ROOT) {
            return []
        }

        return [{
            id: 'cmder',
            name: 'Cmder',
            command: 'cmd.exe',
            args: [
                '/k',
                path.join(process.env.CMDER_ROOT, 'vendor', 'init.bat'),
            ],
            env: {
                TERM: 'cygwin',
            }
        }]
    }
}
