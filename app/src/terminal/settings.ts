import { Injectable } from '@angular/core'
import { SettingsProvider, ComponentType } from '../settings/api'
import { SettingsComponent } from './components/settings'


@Injectable()
export class TerminalSettingsProvider extends SettingsProvider {
    title = 'Terminal'

    getComponentType (): ComponentType {
        return SettingsComponent
    }
}
