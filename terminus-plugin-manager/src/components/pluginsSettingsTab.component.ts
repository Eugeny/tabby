import { BehaviorSubject, Observable } from 'rxjs'
import { debounceTime, distinctUntilChanged, first, tap, flatMap } from 'rxjs/operators'
import * as semver from 'semver'

import { Component, Input } from '@angular/core'
import { ConfigService, HostAppService, ElectronService } from 'terminus-core'
import { IPluginInfo, PluginManagerService } from '../services/pluginManager.service'

enum BusyState { Installing, Uninstalling }

@Component({
    template: require('./pluginsSettingsTab.component.pug'),
    styles: [require('./pluginsSettingsTab.component.scss')],
})
export class PluginsSettingsTabComponent {
    BusyState = BusyState
    @Input() availablePlugins$: Observable<IPluginInfo[]>
    @Input() availablePluginsQuery$ = new BehaviorSubject<string>('')
    @Input() availablePluginsReady = false
    @Input() knownUpgrades: {[id: string]: IPluginInfo} = {}
    @Input() busy: {[id: string]: BusyState} = {}
    @Input() erroredPlugin: string
    @Input() errorMessage: string
    @Input() npmInstalled = false
    @Input() npmMissing = false

    constructor (
        private electron: ElectronService,
        private config: ConfigService,
        private hostApp: HostAppService,
        public pluginManager: PluginManagerService
    ) {
    }

    ngOnInit () {
        this.availablePlugins$ = this.availablePluginsQuery$
            .asObservable()
            .pipe(
                debounceTime(200),
                distinctUntilChanged(),
                flatMap(query => {
                    this.availablePluginsReady = false
                    return this.pluginManager.listAvailable(query).pipe(tap(() => {
                        this.availablePluginsReady = true
                    }))
                })
            )
        this.availablePlugins$.pipe(first()).subscribe(available => {
            for (let plugin of this.pluginManager.installedPlugins) {
                this.knownUpgrades[plugin.name] = available.find(x => x.name === plugin.name && semver.gt(x.version, plugin.version))
            }
        })
        this.checkNPM()
    }

    openPluginsFolder (): void {
        this.hostApp.getShell().openItem(this.pluginManager.userPluginsPath)
    }

    downloadNPM (): void {
        this.hostApp.getShell().openExternal('https://nodejs.org/en/download/current/')
    }

    async checkNPM () {
        this.npmInstalled = await this.pluginManager.isNPMInstalled()
        this.npmMissing = !this.npmInstalled
    }

    searchAvailable (query: string) {
        this.availablePluginsQuery$.next(query)
    }

    isAlreadyInstalled (plugin: IPluginInfo): boolean {
        return this.pluginManager.installedPlugins.some(x => x.name === plugin.name)
    }

    async installPlugin (plugin: IPluginInfo): Promise<void> {
        this.busy[plugin.name] = BusyState.Installing
        try {
            await this.pluginManager.installPlugin(plugin)
            delete this.busy[plugin.name]
            this.config.requestRestart()
        } catch (err) {
            this.erroredPlugin = plugin.name
            this.errorMessage = err
            delete this.busy[plugin.name]
            throw err
        }
    }

    async uninstallPlugin (plugin: IPluginInfo): Promise<void> {
        this.busy[plugin.name] = BusyState.Uninstalling
        try {
            await this.pluginManager.uninstallPlugin(plugin)
            delete this.busy[plugin.name]
            this.config.requestRestart()
        } catch (err) {
            this.erroredPlugin = plugin.name
            this.errorMessage = err
            delete this.busy[plugin.name]
            throw err
        }
    }

    async upgradePlugin (plugin: IPluginInfo): Promise<void> {
        return this.installPlugin(this.knownUpgrades[plugin.name])
    }

    showPluginInfo (plugin: IPluginInfo) {
        this.electron.shell.openExternal('https://www.npmjs.com/package/' + plugin.packageName)
    }

    enablePlugin (plugin: IPluginInfo) {
        this.config.store.pluginBlacklist = this.config.store.pluginBlacklist.filter(x => x !== plugin.name)
        this.config.save()
        this.config.requestRestart()
    }

    disablePlugin (plugin: IPluginInfo) {
        this.config.store.pluginBlacklist = [...this.config.store.pluginBlacklist, plugin.name]
        this.config.save()
        this.config.requestRestart()
    }
}
