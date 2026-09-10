import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'

import { ETSettingsTabComponent } from './components/etSettingsTab.component'

/** @hidden */
@Injectable()
export class ETSettingsTabProvider extends SettingsTabProvider {
    id = 'et'
    icon = 'infinity'
    title = 'Eternal Terminal'

    getComponentType (): any {
        return ETSettingsTabComponent
    }
}
