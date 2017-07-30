import * as fs from 'mz/fs'
import * as path from 'path'
import { Injectable } from '@angular/core'
import { ConfigService, HostAppService, Platform, ElectronService } from 'terminus-core'

import { ShellProvider, IShell } from './api'

@Injectable()
export class POSIXShellsProvider extends ShellProvider {
    constructor (
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<IShell[]> {

    }
}
