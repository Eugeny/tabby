import { exec } from 'mz/child_process'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'tabby-core'

import { ShellProvider, Shell } from '../api'

/** @hidden */
@Injectable()
export class MacOSDefaultShellProvider extends ShellProvider {
    private cachedShell?: string

    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform !== Platform.macOS) {
            return []
        }
        return [{
            id: 'default',
            name: 'OS default',
            command: await this.getDefaultShellCached(),
            args: ['--login'],
            hidden: true,
            env: {},
        }]
    }

    private async getDefaultShellCached () {
        if (!this.cachedShell) {
            this.cachedShell = await this.getDefaultShell()
        }
        return this.cachedShell!
    }

    private async getDefaultShell () {
        const shellEntry = (await exec(`/usr/bin/dscl . -read /Users/${process.env.LOGNAME} UserShell`))[0].toString()
        return shellEntry.split(' ')[1].trim()
    }
}
