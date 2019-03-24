import { Injectable, Inject } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab } from '../api/tabRecovery'
import { BaseTabComponent } from '../components/baseTab.component'
import { Logger, LogService } from '../services/log.service'
import { ConfigService } from '../services/config.service'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class TabRecoveryService {
    logger: Logger

    constructor (
        @Inject(TabRecoveryProvider) private tabRecoveryProviders: TabRecoveryProvider[],
        private config: ConfigService,
        log: LogService
    ) {
        this.logger = log.create('tabRecovery')
    }

    async saveTabs (tabs: BaseTabComponent[]) {
        window.localStorage.tabsRecovery = JSON.stringify(
            await Promise.all(
                tabs
                    .map(tab => tab.getRecoveryToken())
                    .filter(token => !!token)
            )
        )
    }

    async recoverTab (token: any): Promise<RecoveredTab> {
        for (let provider of this.config.enabledServices(this.tabRecoveryProviders)) {
            try {
                let tab = await provider.recover(token)
                if (tab) {
                    return tab
                }
            } catch (error) {
                this.logger.warn('Tab recovery crashed:', token, provider, error)
            }
        }
        return null
    }

    async recoverTabs (): Promise<RecoveredTab[]> {
        if (window.localStorage.tabsRecovery) {
            let tabs: RecoveredTab[] = []
            for (let token of JSON.parse(window.localStorage.tabsRecovery)) {
                let tab = await this.recoverTab(token)
                if (tab) {
                    tabs.push(tab)
                }
            }
            return tabs
        }
        return []
    }

}
