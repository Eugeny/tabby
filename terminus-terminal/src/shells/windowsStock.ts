import * as path from 'path'
import { Injectable } from '@angular/core'
import { HostAppService, Platform, ElectronService } from 'terminus-core'

import { ShellProvider } from '../api/shellProvider'
import { Shell } from '../api/interfaces'

/** @hidden */
@Injectable()
export class WindowsStockShellsProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
        private electron: ElectronService,
    ) {
        super()
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }
        return [
            {
                id: 'clink',
                name: 'CMD (clink)',
                command: 'cmd.exe',
                args: [
                    '/k',
                    path.join(
                        path.dirname(this.electron.app.getPath('exe')),
                        'resources',
                        'extras',
                        'clink',
                        `clink_${process.arch}.exe`,
                    ),
                    'inject',
                ],
                env: {},
                icon: require('../icons/clink.svg'),
            },
            {
                id: 'cmd',
                name: 'CMD (stock)',
                command: 'cmd.exe',
                env: {},
                icon: require('../icons/cmd.svg'),
            },
            {
                id: 'powershell',
                name: 'PowerShell',
                command: 'powershell.exe',
                args: ['-nologo'],
                icon: require('../icons/powershell.svg'),
                env: {
                    TERM: 'cygwin',
                },
            },
        ]
    }
}
