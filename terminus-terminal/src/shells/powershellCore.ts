import { Injectable } from '@angular/core'
import { getRegistryValue, HK } from 'windows-native-registry'
import { HostAppService, Platform } from 'terminus-core'
import { ShellProvider, IShell } from '../api'

@Injectable()
export class PowerShellCoreShellProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        const pwshPath = getRegistryValue(HK.LM, 'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\pwsh.exe', '')

        if (!pwshPath) {
            return []
        }

        return [{
            id: 'powershell-core',
            name: 'PowerShell Core',
            command: pwshPath,
            args: ['-nologo'],
            env: {
                TERM: 'cygwin',
            }
        }]
    }
}
