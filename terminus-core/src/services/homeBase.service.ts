import * as os from 'os'
import { Injectable } from '@angular/core'
import { ElectronService } from './electron.service'
import { ConfigService } from './config.service'
import ua = require('universal-analytics')

@Injectable()
export class HomeBaseService {
    appVersion: string

    constructor (
        private electron: ElectronService,
        private config: ConfigService,
    ) {
        this.appVersion = electron.app.getVersion()

        if (this.config.store.enableAnalytics) {
            this.enableAnalytics()
        }
    }

    openGitHub () {
        this.electron.shell.openExternal('https://github.com/eugeny/terminus')
    }

    reportBug () {
        let body = `Version: ${this.appVersion}\n`
        body += `Platform: ${os.platform()} ${os.release()}\n`
        let label = {
            darwin: 'OS: macOS',
            windows: 'OS: Windows',
            linux: 'OS: Linux',
        }[os.platform()]
        let plugins = (window as any).installedPlugins.filter(x => !x.isBuiltin).map(x => x.name)
        body += `Plugins: ${plugins.join(', ')}\n\n`
        this.electron.shell.openExternal(`https://github.com/eugeny/terminus/issues/new?body=${encodeURIComponent(body)}&labels=${label}`)
    }

    enableAnalytics () {
        const session = ua('UA-3278102-20')
        session.set('cd1', this.appVersion)
        session.set('cd2', process.platform)
        session.pageview('/').send()
    }
}
