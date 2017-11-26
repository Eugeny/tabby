import { Injectable, Inject } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab } from '../api/tabRecovery'
import { BaseTabComponent } from '../components/baseTab.component'
import { Logger, LogService } from '../services/log.service'
import { AppService } from '../services/app.service'
import { ConfigService } from '../services/config.service'

@Injectable()
export class TabRecoveryService {
    logger: Logger

    constructor (
        @Inject(TabRecoveryProvider) private tabRecoveryProviders: TabRecoveryProvider[],
        private app: AppService,
        private config: ConfigService,
        log: LogService
    ) {
        this.logger = log.create('tabRecovery')
        app.tabsChanged$.subscribe(() => {
            this.saveTabs(app.tabs)
        })
    }

    saveTabs (tabs: BaseTabComponent[]) {
        window.localStorage.tabsRecovery = JSON.stringify(
            tabs
                .map((tab) => tab.getRecoveryToken())
                .filter((token) => !!token)
        )
    }

    async recoverTabs (): Promise<void> {
        if (window.localStorage.tabsRecovery) {
            let tabs: RecoveredTab[] = []
            for (let token of JSON.parse(window.localStorage.tabsRecovery)) {
                for (let provider of this.config.enabledServices(this.tabRecoveryProviders)) {
                    try {
                        let tab = await provider.recover(token)
                        if (tab) {
                            tabs.push(tab)
                        }
                    } catch (error) {
                        this.logger.warn('Tab recovery crashed:', token, provider, error)
                    }
                }
            }
            tabs.forEach(tab => {
                this.app.openNewTab(tab.type, tab.options)
            })
        }
    }

}
