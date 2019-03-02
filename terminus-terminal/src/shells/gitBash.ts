import * as path from 'path'
import { Injectable } from '@angular/core'
import { getRegistryValue, HK } from 'windows-native-registry'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

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

        let gitBashPath = getRegistryValue(HK.LM, 'Software\\GitForWindows', 'InstallPath')

        if (!gitBashPath) {
            gitBashPath = getRegistryValue(HK.CU, 'Software\\GitForWindows', 'InstallPath')
        }

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
