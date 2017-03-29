import { Component, Inject } from '@angular/core'
import { ElectronService } from 'services/electron'
import { ConfigService } from 'services/config'
import { DockingService } from 'services/docking'
import { IHotkeyDescription, HotkeyProvider } from 'api/hotkeyProvider'

import { BaseTabComponent } from 'components/baseTab'
import { SettingsTab } from '../tab'
import { SettingsTabProvider } from '../api'


@Component({
  selector: 'settings-pane',
  template: require('./settingsPane.pug'),
  styles: [
    require('./settingsPane.scss'),
    require('./settingsPane.deep.css'),
  ],
})
export class SettingsPaneComponent extends BaseTabComponent<SettingsTab> {
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
    }

    ngOnDestroy () {
        this.config.save()
    }

    restartApp () {
        this.electron.app.relaunch()
        this.electron.app.exit()
    }
}
