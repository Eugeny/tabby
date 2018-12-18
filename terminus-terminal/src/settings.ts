import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'terminus-settings'

import { AppearanceSettingsTabComponent } from './components/appearanceSettingsTab.component'
import { ShellSettingsTabComponent } from './components/shellSettingsTab.component'
import { TerminalSettingsTabComponent } from './components/terminalSettingsTab.component'

@Injectable()
export class AppearanceSettingsTabProvider extends SettingsTabProvider {
    id = 'terminal-appearance'
    title = 'Appearance'

    getComponentType (): any {
        return AppearanceSettingsTabComponent
    }
}

@Injectable()
export class ShellSettingsTabProvider extends SettingsTabProvider {
    id = 'terminal-shell'
    title = 'Shell'

    getComponentType (): any {
        return ShellSettingsTabComponent
    }
}

@Injectable()
export class TerminalSettingsTabProvider extends SettingsTabProvider {
    id = 'terminal'
    title = 'Terminal'

    getComponentType (): any {
        return TerminalSettingsTabComponent
    }
}
