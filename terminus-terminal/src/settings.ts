import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'terminus-settings'

import { AppearanceSettingsTabComponent } from './components/appearanceSettingsTab.component'
import { ShellSettingsTabComponent } from './components/shellSettingsTab.component'
import { TerminalSettingsTabComponent } from './components/terminalSettingsTab.component'

/** @hidden */
@Injectable()
export class AppearanceSettingsTabProvider extends SettingsTabProvider {
    id = 'terminal-appearance'
    icon = 'palette'
    title = 'Appearance'

    getComponentType (): any {
        return AppearanceSettingsTabComponent
    }
}

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

/** @hidden */
@Injectable()
export class TerminalSettingsTabProvider extends SettingsTabProvider {
    id = 'terminal'
    icon = 'terminal'
    title = 'Terminal'

    getComponentType (): any {
        return TerminalSettingsTabComponent
    }
}
