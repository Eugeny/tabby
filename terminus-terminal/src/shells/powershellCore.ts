import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

let Registry = null
try {
    Registry = require('winreg')
} catch (_) { } // tslint:disable-line no-empty

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

        let pwshPath = await new Promise<string>(resolve => {
            let reg = new Registry({ hive: Registry.HKLM, key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\pwsh.exe', arch: 'x64' })
            reg.get('', (err, item) => {
                if (err || !item) {
                    return resolve(null)
                }
                resolve(item.value)
            })
        })

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
