import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'terminus-settings'

import { TerminalSettingsTabComponent } from './components/terminalSettingsTab.component'

@Injectable()
export class TerminalSettingsTabProvider extends SettingsTabProvider {
    id = 'terminal'
    title = 'Terminal'

    getComponentType (): any {
        return TerminalSettingsTabComponent
    }
}
