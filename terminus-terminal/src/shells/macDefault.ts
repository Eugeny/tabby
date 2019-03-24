import { exec } from 'mz/child_process'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

/** @hidden */
@Injectable()
export class MacOSDefaultShellProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {
        if (this.hostApp.platform !== Platform.macOS) {
            return []
        }
        let shellEntry = (await exec(`/usr/bin/dscl . -read /Users/${process.env.LOGNAME} UserShell`))[0].toString()
        return [{
            id: 'default',
            name: 'User default',
            command: shellEntry.split(' ')[1].trim(),
            args: ['--login'],
        }]
    }
}
