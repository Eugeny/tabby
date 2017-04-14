import { Injectable } from '@angular/core'
import { SettingsTabProvider, ComponentType } from 'terminus-settings'

import { TerminalSettingsTabComponent } from './components/terminalSettingsTab'


@Injectable()
export class TerminalSettingsTabProvider extends SettingsTabProvider {
    title = 'Terminal'

    getComponentType (): ComponentType {
        return TerminalSettingsTabComponent
    }
}
