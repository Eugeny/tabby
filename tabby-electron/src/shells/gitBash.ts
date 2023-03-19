import * as path from 'path'
import { Injectable } from '@angular/core'
import { Platform, ConfigService, HostAppService } from 'tabby-core'

import { Shell } from 'tabby-local'
import { WindowsBaseShellProvider } from './windowsBase'

/* eslint-disable block-scoped-var */

try {
    var wnr = require('windows-native-registry') // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

/** @hidden */
@Injectable()
export class GitBashShellProvider extends WindowsBaseShellProvider {
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

        let gitBashPath = wnr.getRegistryValue(wnr.HK.LM, 'Software\\GitForWindows', 'InstallPath')

        if (!gitBashPath) {
            gitBashPath = wnr.getRegistryValue(wnr.HK.CU, 'Software\\GitForWindows', 'InstallPath')
        }

        if (!gitBashPath) {
            return []
        }

        return [{
            id: 'git-bash',
            name: 'Git Bash',
            command: path.join(gitBashPath, 'bin', 'bash.exe'),
            args: ['--login', '-i'],
            icon: require('../icons/git-bash.svg'),
            env: this.getEnvironment(),
        }]
    }
}
