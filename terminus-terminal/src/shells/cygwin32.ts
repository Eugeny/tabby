import * as path from 'path'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

try {
    var wnr = require('windows-native-registry') // tslint:disable-line
} catch { } // tslint:disable-line

/** @hidden */
@Injectable()
export class Cygwin32ShellProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        let cygwinPath = wnr.getRegistryValue(wnr.HK.LM, 'Software\\WOW6432Node\\Cygwin\\setup', 'rootdir')

        if (!cygwinPath) {
            return []
        }

        return [{
            id: 'cygwin32',
            name: 'Cygwin (32 bit)',
            command: path.join(cygwinPath, 'bin', 'bash.exe'),
            env: {
                TERM: 'cygwin',
            }
        }]
    }
}
