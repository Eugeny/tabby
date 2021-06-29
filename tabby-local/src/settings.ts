import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'

import { ShellSettingsTabComponent } from './components/shellSettingsTab.component'

/** @hidden */
@Injectable()
export class ShellSettingsTabProvider extends SettingsTabProvider {
    id = 'terminal-shell'
    icon = 'list-ul'
    title = 'Shell'

    getComponentType (): any {
        return ShellSettingsTabComponent
    }
}
