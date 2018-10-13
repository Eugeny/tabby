import * as fs from 'mz/fs'
import { Registry } from 'rage-edit-tmp'
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

        let lxss = await Registry.get('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Lxss', true)
        if (!lxss || !lxss.$values.defaultdistribution) {
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
        for (let child of Object.values(lxss)) {
            if (!(child as any).$values) {
                continue
            }
            let name = (child as any).$values.distributionname
            shells.push({
                id: `wsl-${name}`,
                name: `WSL / ${name}`,
                command: wslPath,
                args: ['-d', name],
                fsBase: (child as any).$values.basepath + '\\rootfs',
                env: {
                    TERM: 'xterm-color',
                    COLORTERM: 'truecolor',
                }
            })
        }

        return shells
    }
}
