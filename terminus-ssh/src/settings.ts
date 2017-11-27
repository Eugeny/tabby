import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'terminus-settings'

import { SSHSettingsTabComponent } from './components/sshSettingsTab.component'

@Injectable()
export class SSHSettingsTabProvider extends SettingsTabProvider {
    id = 'ssh'
    title = 'SSH'

    getComponentType (): any {
        return SSHSettingsTabComponent
    }
}
