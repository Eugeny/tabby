/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as yaml from 'js-yaml'
import { debounce } from 'utils-decorators/dist/cjs'
import { Subscription } from 'rxjs'
import { Component, Inject, Input, HostBinding, NgZone } from '@angular/core'
import {
    ElectronService,
    ConfigService,
    BaseTabComponent,
    HostAppService,
    Platform,
    HomeBaseService,
    ShellIntegrationService,
    UpdaterService,
} from 'terminus-core'

import { SettingsTabProvider } from '../api'

/** @hidden */
@Component({
    selector: 'settings-tab',
    template: require('./settingsTab.component.pug'),
    styles: [
        require('./settingsTab.component.scss'),
    ],
})
export class SettingsTabComponent extends BaseTabComponent {
    @Input() activeTab: string
    Platform = Platform
    configDefaults: any
    configFile: string
    isShellIntegrationInstalled = false
    checkingForUpdate = false
    updateAvailable = false
    @HostBinding('class.pad-window-controls') padWindowControls = false
    private configSubscription: Subscription

    constructor (
        public config: ConfigService,
        private electron: ElectronService,
        public hostApp: HostAppService,
        public homeBase: HomeBaseService,
        public shellIntegration: ShellIntegrationService,
        public zone: NgZone,
        private updater: UpdaterService,
        @Inject(SettingsTabProvider) public settingsProviders: SettingsTabProvider[],
    ) {
        super()
        this.setTitle('Settings')
        this.settingsProviders = config.enabledServices(this.settingsProviders)
        this.settingsProviders.sort((a, b) => a.title.localeCompare(b.title))

        this.configDefaults = yaml.dump(config.getDefaults())

        const onConfigChange = () => {
            this.configFile = config.readRaw()
            this.padWindowControls = hostApp.platform === Platform.macOS
                && config.store.appearance.tabsLocation !== 'top'
        }

        this.configSubscription = config.changed$.subscribe(onConfigChange)
        onConfigChange()
    }

    async ngOnInit () {
        this.isShellIntegrationInstalled = await this.shellIntegration.isInstalled()
    }

    async toggleShellIntegration () {
        if (!this.isShellIntegrationInstalled) {
            await this.shellIntegration.install()
        } else {
            await this.shellIntegration.remove()
        }
        this.isShellIntegrationInstalled = await this.shellIntegration.isInstalled()
    }

    ngOnDestroy () {
        this.configSubscription.unsubscribe()
        this.config.save()
    }

    restartApp () {
        this.hostApp.relaunch()
    }

    @debounce(500)
    saveConfiguration (requireRestart?: boolean) {
        this.config.save()
        if (requireRestart) {
            this.config.requestRestart()
        }
    }

    saveConfigFile () {
        if (this.isConfigFileValid()) {
            this.config.writeRaw(this.configFile)
        }
    }

    showConfigFile () {
        this.electron.shell.showItemInFolder(this.config.path)
    }

    isConfigFileValid () {
        try {
            yaml.load(this.configFile)
            return true
        } catch (_) {
            return false
        }
    }

    async checkForUpdates () {
        this.checkingForUpdate = true
        this.updateAvailable = await this.updater.check()
        this.checkingForUpdate = false
    }
}
