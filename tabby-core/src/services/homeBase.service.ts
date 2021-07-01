import { Injectable, Inject } from '@angular/core'
import * as mixpanel from 'mixpanel'
import { v4 as uuidv4 } from 'uuid'
import { ConfigService } from './config.service'
import { PlatformService, BOOTSTRAP_DATA, BootstrapData } from '../api'

@Injectable({ providedIn: 'root' })
export class HomeBaseService {
    appVersion: string
    mixpanel: any

    /** @hidden */
    private constructor (
        private config: ConfigService,
        private platform: PlatformService,
        @Inject(BOOTSTRAP_DATA) private bootstrapData: BootstrapData,
    ) {
        this.appVersion = platform.getAppVersion()

        if (this.config.store.enableAnalytics && !this.config.store.enableWelcomeTab) {
            this.enableAnalytics()
        }
    }

    openGitHub (): void {
        this.platform.openExternal('https://github.com/Eugeny/tabby')
    }

    reportBug (): void {
        let body = `Version: ${this.appVersion}\n`
        body += `Platform: ${process.platform} ${this.platform.getOSRelease()}\n`
        const label = {
            aix: 'OS: IBM AIX',
            android: 'OS: Android',
            darwin: 'OS: macOS',
            freebsd: 'OS: FreeBSD',
            linux: 'OS: Linux',
            openbsd: 'OS: OpenBSD',
            sunos: 'OS: Solaris',
            win32: 'OS: Windows',
        }[process.platform]
        const plugins = this.bootstrapData.installedPlugins.filter(x => !x.isBuiltin).map(x => x.name)
        body += `Plugins: ${plugins.join(', ') || 'none'}\n\n`
        this.platform.openExternal(`https://github.com/Eugeny/tabby/issues/new?body=${encodeURIComponent(body)}&labels=${label}`)
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
            distinct_id: window.localStorage.analyticsUserID,
            platform: process.platform,
            os: this.platform.getOSRelease(),
            version: this.appVersion,
        }
    }
}
