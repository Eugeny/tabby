import * as path from 'path'
import * as fs from 'fs/promises'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'tabby-core'

import { ShellProvider, Shell } from 'tabby-local'

/* eslint-disable quote-props */
const vsIconMap: Record<string, string> = {
    '2017': require('../icons/vs2017.svg'),
    '2019': require('../icons/vs2019.svg'),
    '2022': require('../icons/vs2022.svg'),
}
/* eslint-enable quote-props */

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

        const x86ParentPath = path.join(process.env['programfiles(x86)'] ?? 'C:\\Program Files (x86)', 'Microsoft Visual Studio')
        const x64ParentPath = path.join(process.env['programfiles'] ?? 'C:\\Program Files', 'Microsoft Visual Studio')

        const result: Shell[] = []
        for (const parentPath of [x86ParentPath, x64ParentPath]) {
            try {
                await fs.stat(parentPath)
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
                        icon: vsIconMap[version],
                        env: {},
                    })
                }
            } catch (_) {
                // Ignore
            }
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
