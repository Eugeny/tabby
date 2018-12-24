import * as path from 'path'
import * as os from 'os'
import { Injectable } from '@angular/core'
import { ElectronService, HostAppService, Platform } from 'terminus-core'
import { SessionOptions } from '../api'

@Injectable({ providedIn: 'root' })
export class UACService {
    isAvailable = false

    constructor (
        hostApp: HostAppService,
        private electron: ElectronService,
    ) {
        this.isAvailable = hostApp.platform === Platform.Windows
            && parseFloat(os.release()) >= 10
            && parseInt(os.release().split('.')[2]) >= 17692
    }

    patchSessionOptionsForUAC (sessionOptions: SessionOptions): SessionOptions {
        let helperPath = path.join(
            path.dirname(this.electron.app.getPath('exe')),
            'resources',
            'extras',
            'UAC.exe',
        )

        if (process.env.DEV) {
            helperPath = path.join(
                path.dirname(this.electron.app.getPath('exe')),
                '..', '..', '..',
                'extras',
                'UAC.exe',
            )
        }

        let options = { ...sessionOptions }
        options.args = [options.command, ...options.args]
        options.command = helperPath
        return options
    }

}
