import { Injectable } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { HostAppService, Platform } from 'terminus-core'
import { ShellProvider, IShell } from '../api'

try {
    var wnr = require('windows-native-registry') // tslint:disable-line
} catch { } // tslint:disable-line

/** @hidden */
@Injectable()
export class PowerShellCoreShellProvider extends ShellProvider {
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

        const pwshPath = wnr.getRegistryValue(wnr.HK.LM, 'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\pwsh.exe', '')

        if (!pwshPath) {
            return []
        }

        return [{
            id: 'powershell-core',
            name: 'PowerShell Core',
            command: pwshPath,
            args: ['-nologo'],
            icon: this.domSanitizer.bypassSecurityTrustHtml(require('../icons/powershell-core.svg')),
            env: {
                TERM: 'cygwin',
            }
        }]
    }
}
