import { Tab, ComponentType } from '../models/tab'
import { SettingsPaneComponent } from './components/settingsPane'

export class SettingsTab extends Tab {
    constructor () {
        super()
        this.title = 'Settings'
        this.scrollable = true
    }

    getComponentType (): ComponentType<SettingsTab> {
        return SettingsPaneComponent
    }
}
