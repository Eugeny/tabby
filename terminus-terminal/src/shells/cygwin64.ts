import * as path from 'path'
import { Injectable } from '@angular/core'
import { getRegistryValue, HK } from 'windows-native-registry'
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

        let cygwinPath = getRegistryValue(HK.LM, 'Software\\Cygwin\\setup', 'rootdir')

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
