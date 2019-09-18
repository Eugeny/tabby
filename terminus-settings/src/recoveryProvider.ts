import { Injectable } from '@angular/core'
import { TabRecoveryProvider, RecoveredTab } from 'terminus-core'

import { SettingsTabComponent } from './components/settingsTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    async recover (recoveryToken: any): Promise<RecoveredTab|null> {
        if (recoveryToken && recoveryToken.type === 'app:settings') {
            return { type: SettingsTabComponent }
        }
        return null
    }
}
