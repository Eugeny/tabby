import { Injectable, Inject } from '@angular/core'
import { Logger, LogService } from 'services/log'
import { BaseTabComponent } from 'components/baseTab'
import { TabRecoveryProvider } from 'api/tabRecovery'
import { AppService } from 'services/app'


@Injectable()
export class TabRecoveryService {
    logger: Logger

    constructor(
        @Inject(TabRecoveryProvider) private tabRecoveryProviders: TabRecoveryProvider[],
        app: AppService,
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
            for (let token of JSON.parse(window.localStorage.tabsRecovery)) {
                for (let provider of this.tabRecoveryProviders) {
                    try {
                        await provider.recover(token)
                    } catch (error) {
                        this.logger.warn('Tab recovery crashed:', token, provider, error)
                    }
                }
            }
        }
    }

}
