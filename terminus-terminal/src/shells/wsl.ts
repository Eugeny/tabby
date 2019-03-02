import * as fs from 'mz/fs'
import slug from 'slug'

import { getRegistryKey, listRegistrySubkeys } from 'windows-native-registry'

import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider, IShell } from '../api'
import { isWindowsBuild, WIN_BUILD_WSL_EXE_DISTRO_FLAG } from '../utils'

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

        const bashPath = `${process.env.windir}\\system32\\bash.exe`
        const wslPath = `${process.env.windir}\\system32\\wsl.exe`

        let shells: IShell[] = [{
            id: 'wsl',
            name: 'WSL / Default distro',
            command: wslPath,
            env: {
                TERM: 'xterm-color',
                COLORTERM: 'truecolor',
            }
        }]

        const lxssPath = 'Software\\Microsoft\\Windows\\CurrentVersion\\Lxss'
        let lxss = getRegistryKey('HKCU', lxssPath)
        if (!lxss || !lxss.DefaultDistribution || !isWindowsBuild(WIN_BUILD_WSL_EXE_DISTRO_FLAG)) {
            if (await fs.exists(bashPath)) {
                return [{
                    id: 'wsl',
                    name: 'WSL / Bash on Windows',
                    command: bashPath,
                    env: {
                        TERM: 'xterm-color',
                        COLORTERM: 'truecolor',
                    }
                }]
            } else {
                return []
            }
        }
        for (let child of listRegistrySubkeys('HKCU', lxssPath)) {
            let childKey = getRegistryKey('HKCU', lxssPath + '\\' + child)
            if (!childKey.DistributionName) {
                continue
            }
            let name = childKey.DistributionName.value
            shells.push({
                id: `wsl-${slug(name)}`,
                name: `WSL / ${name}`,
                command: wslPath,
                args: ['-d', name],
                fsBase: childKey.BasePath.value + '\\rootfs',
                env: {
                    TERM: 'xterm-color',
                    COLORTERM: 'truecolor',
                }
            })
        }

        return shells
    }
}
