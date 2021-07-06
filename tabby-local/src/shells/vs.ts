import * as path from 'path'
import * as fs from 'fs/promises'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'tabby-core'

import { ShellProvider, Shell } from '../api'

/** @hidden */
@Injectable()
export class VSDevToolsProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        const parentPath = path.join(process.env['programfiles(x86)'] ?? 'C:\\Program Files (x86', 'Microsoft Visual Studio')

        try {
            await fs.stat(parentPath)
        } catch {
            return []
        }

        const result: Shell[] = []
        for (const version of await fs.readdir(parentPath)) {
            const bat = path.join(parentPath, version, 'Community\\Common7\\Tools\\VsDevCmd.bat')
            try {
                await fs.stat(bat)
            } catch {
                continue
            }
            result.push({
                id: `vs-cmd-${version}`,
                name: `Developer Prompt for VS ${version}`,
                command: 'cmd.exe',
                args: ['/k', bat],
                icon: require('../icons/vs.svg'),
                env: {},
            })
        }
        return result

        // return [
        //     {
        //         id: 'cmderps',
        //         name: 'Cmder PowerShell',
        //         command: 'powershell.exe',
        //         args: [
        //             '-ExecutionPolicy',
        //             'Bypass',
        //             '-nologo',
        //             '-noprofile',
        //             '-noexit',
        //             '-command',
        //             `Invoke-Expression '. ''${path.join(process.env.CMDER_ROOT, 'vendor', 'profile.ps1')}'''`,
        //         ],
        //         icon: require('../icons/cmder-powershell.svg'),
        //         env: {},
        //     },
        // ]
    }
}
