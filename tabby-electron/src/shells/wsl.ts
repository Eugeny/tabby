import * as fs from 'mz/fs'
import slugify from 'slugify'

import { Injectable } from '@angular/core'
import { HostAppService, Platform, isWindowsBuild, WIN_BUILD_WSL_EXE_DISTRO_FLAG } from 'tabby-core'

import { ShellProvider, Shell } from 'tabby-local'

import { PowerShell } from 'node-powershell'

/* eslint-disable block-scoped-var */

try {
    var wnr = require('windows-native-registry') // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch { }

// WSL Distribution List
// https://docs.microsoft.com/en-us/windows/wsl/install-win10#install-your-linux-distribution-of-choice
/* eslint-disable quote-props */
const wslIconMap: Record<string, string> = {
    'Alpine': require('../icons/alpine.svg'),
    'Debian': require('../icons/debian.svg'),
    'kali-linux': require('../icons/kali.svg'),
    'SLES-12': require('../icons/suse.svg'),
    'openSUSE-Leap-15-1': require('../icons/suse.svg'),
    'Ubuntu-16.04': require('../icons/ubuntu.svg'),
    'Ubuntu-18.04': require('../icons/ubuntu.svg'),
    'Ubuntu-22.04': require('../icons/ubuntu.svg'),
    'Ubuntu': require('../icons/ubuntu.svg'),
    'AlmaLinux-8': require('../icons/alma.svg'),
    'OracleLinux_7_9': require('../icons/oracle-linux.svg'),
    'OracleLinux_8_5': require('../icons/oracle-linux.svg'),
    'openEuler': require('../icons/open-euler.svg'),
    'Linux': require('../icons/linux.svg'),
    'docker-desktop': require('../icons/docker.svg'),
    'docker-desktop-data': require('../icons/docker.svg'),
}
/* eslint-enable quote-props */

/** @hidden */
@Injectable()
export class WSLShellProvider extends ShellProvider {
    private _pwsh: PowerShell

    constructor (
        private hostApp: HostAppService,
    ) {
        super()

        // make sure that this will not use the powershell profile
        // that may take a long time to load
        this._pwsh = new PowerShell({
            executableOptions: {
                '-NoProfile': true,
            },
        })
    }

    private _resolveIcon (defaultDistKey: any): Promise<string> {
        return this._resolveIconInner(defaultDistKey).catch(e => {
            console.error('Failed to resolve icon for WSL distribution:', defaultDistKey, e)
            return wslIconMap.Linux
        })
    }

    private async _resolveIconInner (defaultDistKey: any): Promise<string> {
        let _icon = wslIconMap.Linux

        // check if the register has PackageFamilyName
        if (defaultDistKey.PackageFamilyName) {
            // get the icon from the package family name
            const packageFamilyName = (defaultDistKey.PackageFamilyName.value as string).split('_')[0]

            if (packageFamilyName) {
                const _ret = await this._pwsh.invoke(`Get-AppxPackage ${packageFamilyName} | ConvertTo-Json`)

                if (!_ret.hadErrors && _ret.stdout?.toString() !== undefined && _ret.stdout.toString() !== '') {
                    const appx = JSON.parse(_ret.stdout.toString())
                    const installationLocation = appx.InstallLocation
                    _icon = `${installationLocation}\\Assets\\Square44x44Logo.targetsize-16.png`
                }
            }
        }

        return _icon
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        const bashPath = `${process.env.windir}\\system32\\bash.exe`
        const wslPath = `${process.env.windir}\\system32\\wsl.exe`

        const lxssPath = 'Software\\Microsoft\\Windows\\CurrentVersion\\Lxss'
        const lxss = wnr.getRegistryKey(wnr.HK.CU, lxssPath)
        const shells: Shell[] = []

        if (lxss?.DefaultDistribution) {
            const defaultDistKey = wnr.getRegistryKey(wnr.HK.CU, lxssPath + '\\' + String(lxss.DefaultDistribution.value))
            if (defaultDistKey?.DistributionName) {
                const _icon = await this._resolveIcon(defaultDistKey)
                const shell: Shell = {
                    id: 'wsl',
                    name: 'WSL / Default distro',
                    command: wslPath,
                    env: {
                        TERM: 'xterm-color',
                        COLORTERM: 'truecolor',
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    icon: wslIconMap[defaultDistKey.DistributionName.value] ?? _icon,
                }
                shells.push(shell)
            }
        }

        if (!lxss?.DefaultDistribution || !isWindowsBuild(WIN_BUILD_WSL_EXE_DISTRO_FLAG)) {
            if (await fs.exists(bashPath)) {
                return [{
                    id: 'wsl',
                    name: 'WSL / Bash on Windows',
                    icon: wslIconMap.Linux,
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
            if (!childKey.DistributionName || !childKey.BasePath) {
                continue
            }

            const _icon = await this._resolveIcon(childKey)
            const wslVersion = (childKey.Flags?.value || 0) & 8 ? 2 : 1
            const name = childKey.DistributionName.value
            const fsBase = wslVersion === 2 ? `\\\\wsl$\\${name}` : childKey.BasePath.value as string + '\\rootfs'
            const slug = slugify(name, { remove: /[:.]/g })
            const shell: Shell = {
                id: `wsl-${slug}`,
                name: `WSL / ${name}`,
                command: wslPath,
                args: ['-d', name],
                fsBase,
                env: {
                    TERM: 'xterm-color',
                    COLORTERM: 'truecolor',
                },
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                icon: wslIconMap[name] ?? _icon,
            }
            shells.push(shell)
        }

        return shells
    }
}
