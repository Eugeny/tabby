import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'terminus-settings'

import { SerialSettingsTabComponent } from './components/serialSettingsTab.component'

/** @hidden */
@Injectable()
export class SerialSettingsTabProvider extends SettingsTabProvider {
    id = 'serial'
    icon = 'keyboard'
    title = 'Serial'

    getComponentType (): any {
        return SerialSettingsTabComponent
    }
}
