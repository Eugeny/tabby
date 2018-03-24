import { Component, Inject, Input } from '@angular/core'
import { ElectronService, DockingService, ConfigService, IHotkeyDescription, HotkeyProvider, BaseTabComponent, Theme, HostAppService } from 'terminus-core'

import { SettingsTabProvider } from '../api'

@Component({
    selector: 'settings-tab',
    template: require('./settingsTab.component.pug'),
    styles: [
        require('./settingsTab.component.scss'),
        require('./settingsTab.deep.component.css'),
    ],
})
export class SettingsTabComponent extends BaseTabComponent {
    @Input() activeTab: string
    hotkeyFilter = ''
    private hotkeyDescriptions: IHotkeyDescription[]
    private screens

    constructor (
        public config: ConfigService,
        private electron: ElectronService,
        public docking: DockingService,
        public hostApp: HostAppService,
        @Inject(HotkeyProvider) hotkeyProviders: HotkeyProvider[],
        @Inject(SettingsTabProvider) public settingsProviders: SettingsTabProvider[],
        @Inject(Theme) public themes: Theme[],
    ) {
        super()
        this.hotkeyDescriptions = config.enabledServices(hotkeyProviders).map(x => x.hotkeys).reduce((a, b) => a.concat(b))
        this.setTitle('Settings')
        this.scrollable = true
        this.screens = this.docking.getScreens()
        this.settingsProviders = config.enabledServices(this.settingsProviders)
        this.themes = config.enabledServices(this.themes)
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
