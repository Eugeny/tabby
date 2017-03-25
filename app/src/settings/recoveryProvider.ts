import { Injectable } from '@angular/core'
import { Tab, TabRecoveryProvider } from 'api'
import { SettingsTab } from './tab'


@Injectable()
export class RecoveryProvider extends TabRecoveryProvider {
    async recover (recoveryToken: any): Promise<Tab> {
        if (recoveryToken.type == 'app:settings') {
            return new SettingsTab()
        }
        return null
    }
}
