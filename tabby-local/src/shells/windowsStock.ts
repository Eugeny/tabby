import * as path from 'path'
import * as fs from 'fs/promises'
import hasbin from 'hasbin'
import { promisify } from 'util'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'tabby-core'
import { ElectronService } from 'tabby-electron'

import { ShellProvider, Shell } from '../api'

/** @hidden */
@Injectable()
export class WindowsStockShellsProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
        private electron: ElectronService,
    ) {
        super()
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        let clinkPath = path.join(
            path.dirname(this.electron.app.getPath('exe')),
            'resources',
            'extras',
            'clink',
            `clink_${process.arch}.exe`,
        )

        if (process.env.TABBY_DEV) {
            clinkPath = path.join(
                path.dirname(this.electron.app.getPath('exe')),
                '..', '..', '..',
                'extras',
                'clink',
                `clink_${process.arch}.exe`,
            )
        }
        return [
            {
                id: 'clink',
                name: 'CMD (clink)',
                command: 'cmd.exe',
                args: ['/k', clinkPath, 'inject'],
                env: {
                    // Tell clink not to emulate ANSI handling
                    WT_SESSION: '0',
                },
                icon: require('../icons/clink.svg'),
            },
            {
                id: 'cmd',
                name: 'CMD (stock)',
                command: 'cmd.exe',
                env: {},
                icon: require('../icons/cmd.svg'),
            },
            {
                id: 'powershell',
                name: 'PowerShell',
                command: await this.getPowerShellPath(),
                args: ['-nologo'],
                icon: require('../icons/powershell.svg'),
                env: {
                    TERM: 'cygwin',
                },
            },
        ]
    }

    private async getPowerShellPath () {
        for (const name of ['pwsh.exe', 'powershell.exe']) {
            if (await promisify(hasbin)(name)) {
                return name
            }
        }
        for (const psPath of [
            `${process.env.USERPROFILE}\\AppData\\Local\\Microsoft\\WindowsApps\\pwsh.exe`,
            `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`,
            `${process.env.SystemRoot}\\System32\\powershell.exe`,
            (process.env.SystemRoot ?? 'C:\\Windows') + '\\powerhshell.exe',
        ]) {
            try {
                await fs.stat(psPath)
                return psPath
            } catch { }
        }
        return 'powershell.exe'
    }
}
