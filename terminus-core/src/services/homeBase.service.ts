import * as os from 'os'
import { Inject, Injectable } from '@angular/core'
import { ElectronService } from './electron.service'

@Injectable()
export class HomeBaseService {
    appVersion: string

    constructor (
        private electron: ElectronService,
    ) {
        this.appVersion = electron.app.getVersion()
    }

    openGitHub () {
        this.electron.shell.openExternal('https://github.com/eugeny/terminus')
    }

    reportBug () {
        let body = `Version: ${this.appVersion}\n`
        body += `Platform: ${os.platform()} ${os.release()}\n\n`
        let label = {
            darwin: 'macOS',
            windows: 'Windows',
            linux: 'Linux',
        }[os.platform()]
        this.electron.shell.openExternal(`https://github.com/eugeny/terminus/issues/new?body=${encodeURIComponent(body)}&labels=${label}`)
    }
}
