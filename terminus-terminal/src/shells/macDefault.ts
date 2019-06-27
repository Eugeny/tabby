import { exec } from 'mz/child_process'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider } from '../api/shellProvider'
import { Shell } from '../api/interfaces'

/** @hidden */
@Injectable()
export class MacOSDefaultShellProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform !== Platform.macOS) {
            return []
        }
        const shellEntry = (await exec(`/usr/bin/dscl . -read /Users/${process.env.LOGNAME} UserShell`))[0].toString()
        return [{
            id: 'default',
            name: 'User default',
            command: shellEntry.split(' ')[1].trim(),
            args: ['--login'],
            hidden: true,
            env: {},
        }]
    }
}
