import { Injectable } from '@angular/core'
import { HostAppService, ConfigService, Platform } from 'tabby-core'

import { Shell } from 'tabby-local'
import { WindowsBaseShellProvider } from './windowsBase'

/* eslint-disable block-scoped-var */

try {
    var wnr = require('windows-native-registry') // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

/** @hidden */
@Injectable()
export class PowerShellCoreShellProvider extends WindowsBaseShellProvider {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (
        hostApp: HostAppService,
        config: ConfigService,
    ) {
        super(hostApp, config)
    }

    async provide (): Promise<Shell[]> {
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
            icon: require('../icons/powershell-core.svg'),
            env: this.getEnvironment(),
        }]
    }
}
