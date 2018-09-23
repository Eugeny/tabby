import * as yaml from 'js-yaml'
import { Subscription } from 'rxjs'
import { Component, Inject, Input } from '@angular/core'
import {
    ElectronService,
    DockingService,
    ConfigService,
    IHotkeyDescription,
    HotkeyProvider,
    BaseTabComponent,
    Theme,
    HostAppService,
    Platform,
    HomeBaseService,
    ShellIntegrationService
} from 'terminus-core'

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
    hotkeyDescriptions: IHotkeyDescription[]
    screens: any[]
    Platform = Platform
    configDefaults: any
    configFile: string
    isShellIntegrationInstalled = false
    private configSubscription: Subscription

    constructor (
        public config: ConfigService,
        private electron: ElectronService,
        public docking: DockingService,
        public hostApp: HostAppService,
        public homeBase: HomeBaseService,
        public shellIntegration: ShellIntegrationService,
        @Inject(HotkeyProvider) hotkeyProviders: HotkeyProvider[],
        @Inject(SettingsTabProvider) public settingsProviders: SettingsTabProvider[],
        @Inject(Theme) public themes: Theme[],
    ) {
        super()
        this.hotkeyDescriptions = config.enabledServices(hotkeyProviders).map(x => x.hotkeys).reduce((a, b) => a.concat(b))
        this.setTitle('Settings')
        this.screens = this.docking.getScreens()
        this.settingsProviders = config.enabledServices(this.settingsProviders)
        this.themes = config.enabledServices(this.themes)

        this.configDefaults = yaml.safeDump(config.getDefaults())
        this.configFile = config.readRaw()
        this.configSubscription = config.changed$.subscribe(() => {
            this.configFile = config.readRaw()
        })
    }

    async ngOnInit () {
        this.isShellIntegrationInstalled = await this.shellIntegration.isInstalled()
    }

    getRecoveryToken (): any {
        return { type: 'app:settings' }
    }

    ngOnDestroy () {
        this.configSubscription.unsubscribe()
        this.config.save()
    }

    restartApp () {
        this.electron.app.relaunch()
        this.electron.app.exit()
    }

    saveConfigFile () {
        if (this.isConfigFileValid()) {
            this.config.writeRaw(this.configFile)
        }
    }

    isConfigFileValid () {
        try {
            yaml.safeLoad(this.configFile)
            return true
        } catch (_) {
            return false
        }
    }

    async installShellIntegration () {
        await this.shellIntegration.install()
        this.isShellIntegrationInstalled = true
    }
}
