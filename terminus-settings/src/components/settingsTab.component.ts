import * as yaml from 'js-yaml'
import * as os from 'os'
import { Subscription } from 'rxjs'
import { Component, Inject, Input } from '@angular/core'
import { HotkeysService } from 'terminus-core'
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
    isFluentVibrancySupported = false
    private configSubscription: Subscription

    constructor (
        public config: ConfigService,
        private electron: ElectronService,
        public docking: DockingService,
        public hostApp: HostAppService,
        public homeBase: HomeBaseService,
        public shellIntegration: ShellIntegrationService,
        hotkeys: HotkeysService,
        @Inject(HotkeyProvider) hotkeyProviders: HotkeyProvider[],
        @Inject(SettingsTabProvider) public settingsProviders: SettingsTabProvider[],
        @Inject(Theme) public themes: Theme[],
    ) {
        super()
        this.setTitle('Settings')
        this.screens = this.docking.getScreens()
        this.settingsProviders = config.enabledServices(this.settingsProviders)
        this.themes = config.enabledServices(this.themes)

        this.configDefaults = yaml.safeDump(config.getDefaults())
        this.configFile = config.readRaw()
        this.configSubscription = config.changed$.subscribe(() => {
            this.configFile = config.readRaw()
        })

        hotkeys.getHotkeyDescriptions().then(descriptions => {
            this.hotkeyDescriptions = descriptions
        })

        this.isFluentVibrancySupported = process.platform === 'win32'
            && parseFloat(os.release()) >= 10
            && parseInt(os.release().split('.')[2]) >= 17063
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

    getHotkey (id: string) {
        let ptr = this.config.store.hotkeys
        for (let token of id.split(/\./g)) {
            ptr = ptr[token]
        }
        return ptr
    }

    setHotkey (id: string, value) {
        let ptr = this.config.store
        let prop = 'hotkeys'
        for (let token of id.split(/\./g)) {
            ptr = ptr[prop]
            prop = token
        }
        ptr[prop] = value
    }
}
