import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, AppService, HostAppService, HotkeysService } from 'terminus-core'

import { SettingsTabComponent } from './components/settingsTab.component'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        hostApp: HostAppService,
        hotkeys: HotkeysService,
        private app: AppService,
    ) {
        super()
        hostApp.preferencesMenu$.subscribe(() => this.open())

        hotkeys.matchedHotkey.subscribe(async (hotkey) => {
            if (hotkey === 'settings') {
                this.open()
            }
        })
    }

    provide (): ToolbarButton[] {
        return [{
            icon: require('./icons/cog.svg'),
            title: 'Settings',
            touchBarNSImage: 'NSTouchBarComposeTemplate',
            weight: 10,
            click: (): void => this.open(),
        }]
    }

    open (): void {
        const settingsTab = this.app.tabs.find(tab => tab instanceof SettingsTabComponent)
        if (settingsTab) {
            this.app.selectTab(settingsTab)
        } else {
            this.app.openNewTabRaw(SettingsTabComponent)
        }
    }
}
