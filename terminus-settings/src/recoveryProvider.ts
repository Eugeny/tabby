import { Injectable } from '@angular/core'
import { TabRecoveryProvider, AppService } from 'terminus-core'

import { SettingsTabComponent } from './components/settingsTab'


@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    constructor(
        private app: AppService
    ) {
        super()
    }

    async recover (recoveryToken: any): Promise<void> {
        if (recoveryToken.type == 'app:settings') {
            this.app.openNewTab(SettingsTabComponent)
        }
    }
}
