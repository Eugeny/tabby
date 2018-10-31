import { Injectable } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { ToolbarButtonProvider, IToolbarButton, AppService, HostAppService, HotkeysService } from 'terminus-core'

import { SettingsTabComponent } from './components/settingsTab.component'

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        hostApp: HostAppService,
        hotkeys: HotkeysService,
        private app: AppService,
        private domSanitizer: DomSanitizer,
    ) {
        super()
        hostApp.preferencesMenu$.subscribe(() => this.open())

        hotkeys.matchedHotkey.subscribe(async (hotkey) => {
            if (hotkey === 'settings') {
                this.open()
            }
        })
    }

    provide (): IToolbarButton[] {
        return [{
            icon: this.domSanitizer.bypassSecurityTrustHtml(require('./icons/cog.svg')),
            title: 'Settings',
            touchBarNSImage: 'NSTouchBarComposeTemplate',
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
