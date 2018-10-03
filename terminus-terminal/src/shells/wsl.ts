import * as fs from 'mz/fs'
import { exec } from 'mz/child_process'
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
        const wslConfigPath = `${process.env.windir}\\system32\\wslconfig.exe`

        if (!await fs.exists(wslPath)) {
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

        let lines = (await exec(`${wslConfigPath} /l`, { encoding: 'ucs2' }))[0].toString().split('\n').splice(1)
        let shells: IShell[] = [{
            id: 'wsl',
            name: 'WSL / Default distro',
            command: wslPath,
            env: {
                TERM: 'xterm-color',
                COLORTERM: 'truecolor',
            }
        }]

        for (let line of lines) {
            line = line.trim()
            if (!line) {
                continue
            }
            if (line.endsWith('(Default)')) {
                line = line.substring(0, line.length - ' (Default)'.length)
            }
            shells.push({
                id: `wsl-${line}`,
                name: `WSL / ${line}`,
                command: wslPath,
                args: ['-d', line],
                env: {
                    TERM: 'xterm-color',
                    COLORTERM: 'truecolor',
                }
            })
        }

        return shells
    }
}
