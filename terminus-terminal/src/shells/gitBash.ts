import * as path from 'path'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

let Registry = null
try {
    Registry = require('winreg')
} catch (_) { } // tslint:disable-line no-empty

@Injectable()
export class GitBashShellProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        let gitBashPath = await new Promise<string>(resolve => {
            let reg = new Registry({ hive: Registry.HKLM, key: '\\Software\\GitForWindows' })
            reg.get('InstallPath', (err, item) => {
                if (err || !item) {
                    resolve(null)
                    return
                }
                resolve(item.value)
            })
        })

        if (!gitBashPath) {
            return []
        }

        return [{
            id: 'git-bash',
            name: 'Git-Bash',
            command: path.join(gitBashPath, 'bin', 'bash.exe'),
            args: [ '--login', '-i' ],
            env: {
                TERM: 'cygwin',
            }
        }]
    }
}
