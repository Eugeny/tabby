import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'

import { AppearanceSettingsTabComponent } from './components/appearanceSettingsTab.component'
import { TerminalSettingsTabComponent } from './components/terminalSettingsTab.component'
import { ColorSchemeSettingsTabComponent } from './components/colorSchemeSettingsTab.component'

/** @hidden */
@Injectable()
export class AppearanceSettingsTabProvider extends SettingsTabProvider {
    id = 'terminal-appearance'
    icon = 'swatchbook'
    title = 'Appearance'
    prioritized = true

    getComponentType (): any {
        return AppearanceSettingsTabComponent
    }
}

/** @hidden */
@Injectable()
export class ColorSchemeSettingsTabProvider extends SettingsTabProvider {
    id = 'terminal-color-scheme'
    icon = 'palette'
    title = 'Color scheme'

    getComponentType (): any {
        return ColorSchemeSettingsTabComponent
    }
}

/** @hidden */
@Injectable()
export class TerminalSettingsTabProvider extends SettingsTabProvider {
    id = 'terminal'
    icon = 'terminal'
    title = 'Terminal'
    prioritized = true

    getComponentType (): any {
        return TerminalSettingsTabComponent
    }
}
