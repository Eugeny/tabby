import * as os from 'os'
import { Injectable } from '@angular/core'
import { ElectronService } from './electron.service'
import { ConfigService } from './config.service'
import * as mixpanel from 'mixpanel'
import * as uuidv4 from 'uuid/v4'

@Injectable({ providedIn: 'root' })
export class HomeBaseService {
    appVersion: string
    mixpanel: any

    /** @hidden */
    constructor (
        private electron: ElectronService,
        private config: ConfigService,
    ) {
        this.appVersion = electron.app.getVersion()

        if (this.config.store.enableAnalytics && !this.config.store.enableWelcomeTab) {
            this.enableAnalytics()
        }
    }

    openGitHub (): void {
        this.electron.shell.openExternal('https://github.com/eugeny/terminus')
    }

    reportBug (): void {
        let body = `Version: ${this.appVersion}\n`
        body += `Platform: ${os.platform()} ${os.release()}\n`
        const label = {
            aix: 'OS: IBM AIX',
            android: 'OS: Android',
            darwin: 'OS: macOS',
            freebsd: 'OS: FreeBSD',
            linux: 'OS: Linux',
            openbsd: 'OS: OpenBSD',
            sunos: 'OS: Solaris',
            win32: 'OS: Windows',
        }[os.platform()]
        const plugins = (window as any).installedPlugins.filter(x => !x.isBuiltin).map(x => x.name)
        body += `Plugins: ${plugins.join(', ') || 'none'}\n\n`
        this.electron.shell.openExternal(`https://github.com/eugeny/terminus/issues/new?body=${encodeURIComponent(body)}&labels=${label}`)
    }

    enableAnalytics (): void {
        if (!window.localStorage.analyticsUserID) {
            window.localStorage.analyticsUserID = uuidv4()
        }
        this.mixpanel = mixpanel.init('bb4638b0860eef14c04d4fbc5eb365fa')
        if (!window.localStorage.installEventSent) {
            this.mixpanel.track('freshInstall', this.getAnalyticsProperties())
            window.localStorage.installEventSent = true
        }
        this.mixpanel.track('launch', this.getAnalyticsProperties())
    }

    getAnalyticsProperties (): Record<string, string> {
        return {
            distinct_id: window.localStorage.analyticsUserID, // eslint-disable-line @typescript-eslint/camelcase
            platform: process.platform,
            os: os.release(),
            version: this.appVersion,
        }
    }
}
