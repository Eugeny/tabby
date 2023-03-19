import { Injectable } from '@angular/core'
import * as path from 'path'
import { WIN_BUILD_CONPTY_SUPPORTED, isWindowsBuild } from 'tabby-core'
import { SessionOptions, UACService } from 'tabby-local'
import { ElectronService } from './electron.service'

/** @hidden */
@Injectable()
export class ElectronUACService extends UACService {
    constructor (
        private electron: ElectronService,
    ) {
        super()
        this.isAvailable = isWindowsBuild(WIN_BUILD_CONPTY_SUPPORTED)
    }

    patchSessionOptionsForUAC (sessionOptions: SessionOptions): SessionOptions {
        let helperPath = path.join(
            path.dirname(this.electron.app.getPath('exe')),
            'resources',
            'extras',
            'UAC.exe',
        )

        if (process.env.TABBY_DEV) {
            helperPath = path.join(
                path.dirname(this.electron.app.getPath('exe')),
                '..', '..', '..',
                'extras',
                'UAC.exe',
            )
        }

        const options = { ...sessionOptions }
        options.args = [options.command, ...options.args ?? []]
        options.command = helperPath
        return options
    }
}
