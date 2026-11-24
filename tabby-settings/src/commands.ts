import { Injectable } from '@angular/core'
import { CommandProvider, AppService, HostAppService, TranslateService, Command, CommandLocation } from 'tabby-core'

import { SettingsTabComponent } from './components/settingsTab.component'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class SettingsCommandProvider extends CommandProvider {
    constructor (
        hostApp: HostAppService,
        private app: AppService,
        private translate: TranslateService,
    ) {
        super()
        hostApp.settingsUIRequest$.subscribe(() => this.open())
    }

    async provide (): Promise<Command[]> {
        return [{
            id: 'settings:open',
            icon: require('./icons/cog.svg'),
            label: this.translate.instant('Settings'),
            weight: 99,
            locations: [CommandLocation.RightToolbar, CommandLocation.StartPage],
            hotkey: 'settings',
            run: async () => this.open(),
        }]
    }

    open (): void {
        const settingsTab = this.app.tabs.find(tab => tab instanceof SettingsTabComponent)
        if (settingsTab) {
            this.app.selectTab(settingsTab)
        } else {
            this.app.openNewTabRaw({ type: SettingsTabComponent })
        }
    }
}
