import * as fs from 'mz/fs'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

@Injectable()
export class WSLShellProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        const wslPath = `${process.env.windir}\\system32\\bash.exe`
        if (!await fs.exists(wslPath)) {
            return []
        }

        return [{
            id: 'wsl',
            name: 'Bash on Windows',
            command: wslPath,
            env: {
                TERM: 'xterm-color',
            }
        }]
    }
}
