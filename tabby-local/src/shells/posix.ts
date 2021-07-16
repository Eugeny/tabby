import * as fs from 'mz/fs'
import slugify from 'slugify'
import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'tabby-core'

import { ShellProvider, Shell } from '../api'

/** @hidden */
@Injectable()
export class POSIXShellsProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform === Platform.Windows) {
            return []
        }
        return (await fs.readFile('/etc/shells', { encoding: 'utf-8' }))
            .split('\n')
            .map(x => x.trim())
            .filter(x => x && !x.startsWith('#'))
            .map(x => ({
                id: slugify(x),
                name: x.split('/').pop(),
                icon: 'fas fa-terminal',
                command: x,
                args: ['-l'],
                env: {},
            }))
    }
}
