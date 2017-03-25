import { Injectable } from '@angular/core'
import { Tab, TabRecoveryProvider } from 'api'
import { SettingsTab } from './tab'


@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    recover (recoveryToken: any): Tab {
        if (recoveryToken.type == 'app:settings') {
            return new SettingsTab()
        }
        return null
    }
}
