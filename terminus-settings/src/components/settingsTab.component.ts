import * as yaml from 'js-yaml'
import * as path from 'path'
import * as fs from 'mz/fs'
import { exec } from 'mz/child_process'
import { Subscription } from 'rxjs'
import { Component, Inject, Input } from '@angular/core'
import { ElectronService, DockingService, ConfigService, IHotkeyDescription, HotkeyProvider, BaseTabComponent, Theme, HostAppService, Platform, HomeBaseService } from 'terminus-core'

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
    automatorWorkflowsInstalled = false
    private configSubscription: Subscription
    private automatorWorkflows = ['Open Terminus here.workflow', 'Paste path into Terminus.workflow']
    private automatorWorkflowsLocation: string
    private automatorWorkflowsDestination: string

    constructor (
        public config: ConfigService,
        private electron: ElectronService,
        public docking: DockingService,
        public hostApp: HostAppService,
        public homeBase: HomeBaseService,
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

        this.automatorWorkflowsLocation = path.join(
            path.dirname(path.dirname(this.electron.app.getPath('exe'))),
            'Resources',
            'extras',
            'automator-workflows',
        )

        this.automatorWorkflowsDestination = path.join(process.env.HOME, 'Library', 'Services')
    }

    async ngOnInit () {
        this.automatorWorkflowsInstalled = await fs.exists(path.join(this.automatorWorkflowsDestination, this.automatorWorkflows[0]))
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

    async installAutomatorWorkflows () {
        for (let wf of this.automatorWorkflows) {
            await exec(`cp -r "${this.automatorWorkflowsLocation}/${wf}" "${this.automatorWorkflowsDestination}"`)
        }
        this.automatorWorkflowsInstalled = true
    }
}
