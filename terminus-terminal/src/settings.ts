import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'terminus-settings'

import { AppearanceSettingsTabComponent } from './components/appearanceSettingsTab.component'
import { ShellSettingsTabComponent } from './components/shellSettingsTab.component'
import { TerminalSettingsTabComponent } from './components/terminalSettingsTab.component'
import { ProfilesSettingsTabComponent } from './components/profilesSettingsTab.component'

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

@Injectable()
export class ProfilesSettingsTabProvider extends SettingsTabProvider {
    id = 'profiles'
    title = 'Profiles'

    getComponentType (): any {
        return ProfilesSettingsTabComponent
    }
}
