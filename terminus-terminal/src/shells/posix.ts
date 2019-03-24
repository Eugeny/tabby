import * as fs from 'mz/fs'
import slug from 'slug'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider, IShell } from '../api'

/** @hidden */
@Injectable()
export class POSIXShellsProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {
        if (this.hostApp.platform === Platform.Windows) {
            return []
        }
        return (await fs.readFile('/etc/shells', { encoding: 'utf-8' }))
            .split('\n')
            .map(x => x.trim())
            .filter(x => x && !x.startsWith('#'))
            .map(x => ({
                id: slug(x),
                name: x,
                command: x,
                args: ['-l'],
            }))
    }
}
