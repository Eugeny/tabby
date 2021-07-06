import { Injectable } from '@angular/core'
import { HostAppService, Platform } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'

import { ShellSettingsTabComponent } from './components/shellSettingsTab.component'

/** @hidden */
@Injectable()
export class ShellSettingsTabProvider extends SettingsTabProvider {
    id = 'terminal-shell'
    icon = 'list-ul'
    title = 'Shell'

    constructor (private hostApp: HostAppService) {
        super()
    }

    getComponentType (): any {
        if (this.hostApp.platform === Platform.Windows) {
            return ShellSettingsTabComponent
        }
    }
}
