import { Injectable, Inject } from '@angular/core'
import { TabRecoveryProvider, RecoveryToken } from '../api/tabRecovery'
import { BaseTabComponent } from '../components/baseTab.component'
import { Logger, LogService } from './log.service'
import { ConfigService } from './config.service'
import { NewTabParameters } from './tabs.service'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class TabRecoveryService {
    logger: Logger
    enabled = false

    private constructor (
        @Inject(TabRecoveryProvider) private tabRecoveryProviders: TabRecoveryProvider<BaseTabComponent>[]|null,
        private config: ConfigService,
        log: LogService
    ) {
        this.logger = log.create('tabRecovery')
    }

    async saveTabs (tabs: BaseTabComponent[]): Promise<void> {
        if (!this.enabled || !this.config.store.recoverTabs) {
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
            token.tabCustomTitle = tab.customTitle
            if (tab.color) {
                token.tabColor = tab.color
            }
            token.disableDynamicTitle = tab['disableDynamicTitle']
        }
        return token
    }

    async recoverTab (token: RecoveryToken, duplicate = false): Promise<NewTabParameters<BaseTabComponent>|null> {
        for (const provider of this.config.enabledServices(this.tabRecoveryProviders ?? [])) {
            try {
                if (!await provider.applicableTo(token)) {
                    continue
                }
                if (duplicate) {
                    token = provider.duplicate(token)
                }
                const tab = await provider.recover(token)
                tab.inputs = tab.inputs ?? {}
                tab.inputs.color = token.tabColor ?? null
                tab.inputs.title = token.tabTitle || ''
                tab.inputs.customTitle = token.tabCustomTitle || ''
                tab.inputs.disableDynamicTitle = token.disableDynamicTitle
                return tab
            } catch (error) {
                this.logger.warn('Tab recovery crashed:', token, provider, error)
            }
        }
        return null
    }

    async recoverTabs (): Promise<NewTabParameters<BaseTabComponent>[]> {
        if (window.localStorage.tabsRecovery) {
            const tabs: NewTabParameters<BaseTabComponent>[] = []
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
