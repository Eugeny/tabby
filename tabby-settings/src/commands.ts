import { Injectable } from '@angular/core'
import { CommandProvider, AppService, HostAppService, HotkeysService, TranslateService, Command, CommandLocation } from 'tabby-core'

import { SettingsTabComponent } from './components/settingsTab.component'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class SettingsCommandProvider extends CommandProvider {
    constructor (
        hostApp: HostAppService,
        hotkeys: HotkeysService,
        private app: AppService,
        private translate: TranslateService,
    ) {
        super()
        hostApp.settingsUIRequest$.subscribe(() => this.open())

        hotkeys.hotkey$.subscribe(async (hotkey) => {
            if (hotkey === 'settings') {
                this.open()
            }
        })
    }

    async provide (): Promise<Command[]> {
        return [{
            id: 'settings:open',
            icon: require('./icons/cog.svg'),
            label: this.translate.instant('Settings'),
            weight: 99,
            locations: [CommandLocation.RightToolbar, CommandLocation.StartPage],
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
