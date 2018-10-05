import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

import { WSLShellProvider } from './wsl'
import { PowerShellCoreShellProvider } from './powershellCore'
import { WindowsStockShellsProvider } from './windowsStock'

@Injectable()
export class WindowsDefaultShellProvider extends ShellProvider {
    private providers: ShellProvider[]

    constructor (
        psc: PowerShellCoreShellProvider,
        wsl: WSLShellProvider,
        stock: WindowsStockShellsProvider,
        private hostApp: HostAppService,
    ) {
        super()
        this.providers = [
            psc,
            wsl,
            stock,
        ]
    }

    async provide (): Promise<IShell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }
        // Figure out a sensible default
        let shellLists = await Promise.all(this.providers.map(x => x.provide()))
        for (let list of shellLists) {
            if (list.length) {
                let shell = list[list.length - 1]

                return [{
                    ...shell,
                    id: 'default',
                    name: 'User default',
                }]
            }
        }

        return []
    }
}
