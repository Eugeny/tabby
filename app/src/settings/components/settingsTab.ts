import { Component, Inject } from '@angular/core'
import { ElectronService } from 'services/electron'
import { ConfigService } from 'services/config'
import { DockingService } from 'services/docking'
import { IHotkeyDescription, HotkeyProvider, BaseTabComponent } from 'api'

import { SettingsTabProvider } from '../api'


@Component({
  selector: 'settings-tab',
  template: require('./settingsTab.pug'),
  styles: [
    require('./settingsTab.scss'),
    require('./settingsTab.deep.css'),
  ],
})
export class SettingsTabComponent extends BaseTabComponent {
    globalHotkey = ['Ctrl+Shift+G']
    private hotkeyDescriptions: IHotkeyDescription[]

    constructor(
        public config: ConfigService,
        private electron: ElectronService,
        public docking: DockingService,
        @Inject(HotkeyProvider) hotkeyProviders: HotkeyProvider[],
        @Inject(SettingsTabProvider) public settingsProviders: SettingsTabProvider[]
    ) {
        super()
        this.hotkeyDescriptions = hotkeyProviders.map(x => x.hotkeys).reduce((a, b) => a.concat(b))
        this.title$.next('Settings')
        this.scrollable = true
    }

    getRecoveryToken (): any {
        return { type: 'app:settings' }
    }

    ngOnDestroy () {
        this.config.save()
    }

    restartApp () {
        this.electron.app.relaunch()
        this.electron.app.exit()
    }
}
