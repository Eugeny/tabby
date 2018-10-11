import * as path from 'path'
import { Injectable } from '@angular/core'
import { Registry } from 'rage-edit-tmp'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

@Injectable()
export class Cygwin64ShellProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        let cygwinPath = await Registry.get('HKLM\\Software\\Cygwin\\setup', 'rootdir')

        if (!cygwinPath) {
            return []
        }

        return [{
            id: 'cygwin64',
            name: 'Cygwin',
            command: path.join(cygwinPath, 'bin', 'bash.exe'),
            env: {
                TERM: 'cygwin',
            }
        }]
    }
}
