import { Component, Inject } from '@angular/core'
import { ElectronService } from 'services/electron'
import { ConfigService } from 'services/config'
import { DockingService } from 'services/docking'

import { BaseTabComponent } from 'components/baseTab'
import { SettingsTab } from '../tab'
import { SettingsProvider } from '../api'


@Component({
  selector: 'settings-pane',
  template: require('./settingsPane.pug'),
  styles: [require('./settingsPane.less')],
})
export class SettingsPaneComponent extends BaseTabComponent<SettingsTab> {
    globalHotkey = ['Ctrl+Shift+G']

    constructor(
        public config: ConfigService,
        private electron: ElectronService,
        public docking: DockingService,
        @Inject(SettingsProvider) public settingsProviders: SettingsProvider[]
    ) {
        super()
    }

    ngOnDestroy () {
        this.config.save()
    }

    restartApp () {
        this.electron.app.relaunch()
        this.electron.app.exit()
    }
}
