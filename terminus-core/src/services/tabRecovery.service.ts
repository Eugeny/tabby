import { Injectable, Inject } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab, RecoveryToken } from '../api/tabRecovery'
import { BaseTabComponent } from '../components/baseTab.component'
import { Logger, LogService } from '../services/log.service'
import { ConfigService } from '../services/config.service'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class TabRecoveryService {
    logger: Logger
    enabled = false

    private constructor (
        @Inject(TabRecoveryProvider) private tabRecoveryProviders: TabRecoveryProvider[]|null,
        private config: ConfigService,
        log: LogService
    ) {
        this.logger = log.create('tabRecovery')
    }

    async saveTabs (tabs: BaseTabComponent[]): Promise<void> {
        if (!this.enabled) {
            return
        }
        window.localStorage.tabsRecovery = JSON.stringify(
            (await Promise.all(
                tabs.map(async tab => this.getFullRecoveryToken(tab))
            )).filter(token => !!token)
        )
    }

    async getFullRecoveryToken (tab: BaseTabComponent): Promise<RecoveryToken|null> {
        const token = await tab.getRecoveryToken()
        if (token) {
            token.tabTitle = tab.title
            if (tab.color) {
                token.tabColor = tab.color
            }
        }
        return token
    }

    async recoverTab (token: RecoveryToken, duplicate = false): Promise<RecoveredTab|null> {
        for (const provider of this.config.enabledServices(this.tabRecoveryProviders ?? [])) {
            try {
                if (!await provider.applicableTo(token)) {
                    continue
                }
                if (duplicate) {
                    token = provider.duplicate(token)
                }
                const tab = await provider.recover(token)
                tab.options = tab.options || {}
                tab.options.color = token.tabColor ?? null
                tab.options.title = token.tabTitle || ''
                return tab
            } catch (error) {
                this.logger.warn('Tab recovery crashed:', token, provider, error)
            }
        }
        return null
    }

    async recoverTabs (): Promise<RecoveredTab[]> {
        if (window.localStorage.tabsRecovery) {
            const tabs: RecoveredTab[] = []
            for (const token of JSON.parse(window.localStorage.tabsRecovery)) {
                const tab = await this.recoverTab(token)
                if (tab) {
                    tabs.push(tab)
                }
            }
            return tabs
        }
        return []
    }
}
