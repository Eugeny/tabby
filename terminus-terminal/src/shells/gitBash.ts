import * as path from 'path'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider } from '../api/shellProvider'
import { Shell } from '../api/interfaces'

/* eslint-disable block-scoped-var */

try {
    var wnr = require('windows-native-registry') // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

/** @hidden */
@Injectable()
export class GitBashShellProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        let gitBashPath = wnr.getRegistryValue(wnr.HK.LM, 'Software\\GitForWindows', 'InstallPath')

        if (!gitBashPath) {
            gitBashPath = wnr.getRegistryValue(wnr.HK.CU, 'Software\\GitForWindows', 'InstallPath')
        }

        if (!gitBashPath) {
            return []
        }

        return [{
            id: 'git-bash',
            name: 'Git-Bash',
            command: path.join(gitBashPath, 'bin', 'bash.exe'),
            args: ['--login', '-i'],
            icon: require('../icons/git-bash.svg'),
            env: {
                TERM: 'cygwin',
            },
        }]
    }
}
