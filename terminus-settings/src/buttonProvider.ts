import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, IToolbarButton, AppService, HostAppService } from 'terminus-core'

import { SettingsTabComponent } from './components/settingsTab.component'

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        hostApp: HostAppService,
        private app: AppService,
    ) {
        super()
        hostApp.preferencesMenu$.subscribe(() => this.open())
    }

    provide (): IToolbarButton[] {
        return [{
            icon: 'sliders',
            title: 'Settings',
            weight: 10,
            click: () => this.open(),
        }]
    }

    open (): void {
        let settingsTab = this.app.tabs.find((tab) => tab instanceof SettingsTabComponent)
        if (settingsTab) {
            this.app.selectTab(settingsTab)
        } else {
            this.app.openNewTab(SettingsTabComponent)
        }
    }
}
