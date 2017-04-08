import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, IToolbarButton, AppService } from 'api'
import { SettingsTabComponent } from './components/settingsTab'


@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private app: AppService,
    ) {
        super()
    }

    provide (): IToolbarButton[] {
        return [{
            icon: 'cog',
            title: 'Settings',
            weight: 10,
            click: () => {
                let settingsTab = this.app.tabs.find((tab) => tab instanceof SettingsTabComponent)
                if (settingsTab) {
                    this.app.selectTab(settingsTab)
                } else {
                    this.app.openNewTab(SettingsTabComponent)
                }
            }
        }]
    }
}
