import * as path from 'path'
import { Injectable } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider } from '../api/shellProvider'
import { IShell } from '../api/interfaces'

try {
    var wnr = require('windows-native-registry') // tslint:disable-line
} catch { } // tslint:disable-line

/** @hidden */
@Injectable()
export class Cygwin64ShellProvider extends ShellProvider {
    constructor (
        private domSanitizer: DomSanitizer,
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        const cygwinPath = wnr.getRegistryValue(wnr.HK.LM, 'Software\\Cygwin\\setup', 'rootdir')

        if (!cygwinPath) {
            return []
        }

        return [{
            id: 'cygwin64',
            name: 'Cygwin',
            command: path.join(cygwinPath, 'bin', 'bash.exe'),
            icon: this.domSanitizer.bypassSecurityTrustHtml(require('../icons/cygwin.svg')),
            env: {
                TERM: 'cygwin',
            }
        }]
    }
}
