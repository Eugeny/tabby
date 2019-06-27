import * as fs from 'mz/fs'
import slug from 'slug'

import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider } from '../api/shellProvider'
import { Shell } from '../api/interfaces'
import { isWindowsBuild, WIN_BUILD_WSL_EXE_DISTRO_FLAG } from '../utils'

/* eslint-disable block-scoped-var */

try {
    var wnr = require('windows-native-registry') // eslint-disable-line @typescript-eslint/no-var-requires
} catch { }

/** @hidden */
@Injectable()
export class WSLShellProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        const bashPath = `${process.env.windir}\\system32\\bash.exe`
        const wslPath = `${process.env.windir}\\system32\\wsl.exe`

        const shells: Shell[] = [{
            id: 'wsl',
            name: 'WSL / Default distro',
            command: wslPath,
            env: {
                TERM: 'xterm-color',
                COLORTERM: 'truecolor',
            },
        }]

        const lxssPath = 'Software\\Microsoft\\Windows\\CurrentVersion\\Lxss'
        const lxss = wnr.getRegistryKey(wnr.HK.CU, lxssPath)
        if (!lxss || !lxss.DefaultDistribution || !isWindowsBuild(WIN_BUILD_WSL_EXE_DISTRO_FLAG)) {
            if (await fs.exists(bashPath)) {
                return [{
                    id: 'wsl',
                    name: 'WSL / Bash on Windows',
                    command: bashPath,
                    env: {
                        TERM: 'xterm-color',
                        COLORTERM: 'truecolor',
                    },
                }]
            } else {
                return []
            }
        }
        for (const child of wnr.listRegistrySubkeys(wnr.HK.CU, lxssPath) as string[]) {
            const childKey = wnr.getRegistryKey(wnr.HK.CU, lxssPath + '\\' + child)
            if (!childKey.DistributionName) {
                continue
            }
            const name = childKey.DistributionName.value
            shells.push({
                id: `wsl-${slug(name)}`,
                name: `WSL / ${name}`,
                command: wslPath,
                args: ['-d', name],
                fsBase: childKey.BasePath.value as string + '\\rootfs',
                env: {
                    TERM: 'xterm-color',
                    COLORTERM: 'truecolor',
                },
            })
        }

        return shells
    }
}
