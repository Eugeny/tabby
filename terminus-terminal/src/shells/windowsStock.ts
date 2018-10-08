import * as path from 'path'
import { Injectable } from '@angular/core'
import { HostAppService, Platform, ElectronService } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

@Injectable()
export class WindowsStockShellsProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
        private electron: ElectronService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {
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
                ]
            },
            { id: 'cmd', name: 'CMD (stock)', command: 'cmd.exe' },
            {
                id: 'powershell',
                name: 'PowerShell',
                command: 'powershell.exe',
                args: ['-nologo'],
                env: {
                    TERM: 'cygwin',
                }
            },
        ]
    }
}
