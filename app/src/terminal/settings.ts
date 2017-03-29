import { Injectable } from '@angular/core'
import { SettingsTabProvider, ComponentType } from '../settings/api'
import { SettingsComponent } from './components/settings'


@Injectable()
export class TerminalSettingsProvider extends SettingsTabProvider {
    title = 'Terminal'

    getComponentType (): ComponentType {
        return SettingsComponent
    }
}
