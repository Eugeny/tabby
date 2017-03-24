import { Injectable } from '@angular/core'
import { Tab, ITabRecoveryProvider } from 'api'
import { SettingsTab } from './tab'


@Injectable()
export class RecoveryProvider implements ITabRecoveryProvider {
    recover (recoveryToken: any): Tab {
        if (recoveryToken.type == 'app:settings') {
            return new SettingsTab()
        }
        return null
    }
}
