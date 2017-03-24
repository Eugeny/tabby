import { Injectable } from '@angular/core'
import { IToolbarButtonProvider, IToolbarButton, AppService } from 'api'
import { SettingsTab } from './tab'


@Injectable()
export class ButtonProvider implements IToolbarButtonProvider {
    constructor (
        private app: AppService,
    ) { }

    provide (): IToolbarButton[] {
        return [{
            icon: 'cog',
            title: 'Settings',
            weight: 10,
            click: () => {
                let settingsTab = this.app.tabs.find((tab) => tab instanceof SettingsTab)
                if (settingsTab) {
                    this.app.selectTab(settingsTab)
                } else {
                    this.app.openTab(new SettingsTab())
                }
            }
        }]
    }
}
