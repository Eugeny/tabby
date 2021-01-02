/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { BehaviorSubject, Observable } from 'rxjs'
import { debounceTime, distinctUntilChanged, first, tap, flatMap, map } from 'rxjs/operators'
import semverGt from 'semver/functions/gt'

import { Component, Input } from '@angular/core'
import { ConfigService, ElectronService } from 'terminus-core'
import { PluginInfo, PluginManagerService } from '../services/pluginManager.service'

enum BusyState { Installing = 'Installing', Uninstalling = 'Uninstalling' }

/** @hidden */
@Component({
    template: require('./pluginsSettingsTab.component.pug'),
    styles: [require('./pluginsSettingsTab.component.scss')],
})
export class PluginsSettingsTabComponent {
    BusyState = BusyState
    @Input() availablePlugins$: Observable<PluginInfo[]>
    @Input() availablePluginsQuery$ = new BehaviorSubject<string>('')
    @Input() availablePluginsReady = false
    @Input() knownUpgrades: Record<string, PluginInfo|null> = {}
    @Input() busy = new Map<string, BusyState>()
    @Input() erroredPlugin: string
    @Input() errorMessage: string

    constructor (
        private electron: ElectronService,
        private config: ConfigService,
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
        this.availablePlugins$.pipe(first(), map((plugins: PluginInfo[]) => {
            plugins.sort((a, b) => a.name > b.name ? 1 : -1)
            return plugins
        })).subscribe(available => {
            for (const plugin of this.pluginManager.installedPlugins) {
                this.knownUpgrades[plugin.name] = available.find(x => x.name === plugin.name && semverGt(x.version, plugin.version)) || null
            }
        })
    }

    openPluginsFolder (): void {
        this.electron.shell.openPath(this.pluginManager.userPluginsPath)
    }

    searchAvailable (query: string) {
        this.availablePluginsQuery$.next(query)
    }

    isAlreadyInstalled (plugin: PluginInfo): boolean {
        return this.pluginManager.installedPlugins.some(x => x.name === plugin.name)
    }

    async installPlugin (plugin: PluginInfo): Promise<void> {
        this.busy.set(plugin.name, BusyState.Installing)
        try {
            await this.pluginManager.installPlugin(plugin)
            this.busy.delete(plugin.name)
            this.config.requestRestart()
        } catch (err) {
            this.erroredPlugin = plugin.name
            this.errorMessage = err
            this.busy.delete(plugin.name)
            throw err
        }
    }

    async uninstallPlugin (plugin: PluginInfo): Promise<void> {
        this.busy.set(plugin.name, BusyState.Uninstalling)
        try {
            await this.pluginManager.uninstallPlugin(plugin)
            this.busy.delete(plugin.name)
            this.config.requestRestart()
        } catch (err) {
            this.erroredPlugin = plugin.name
            this.errorMessage = err
            this.busy.delete(plugin.name)
            throw err
        }
    }

    async upgradePlugin (plugin: PluginInfo): Promise<void> {
        return this.installPlugin(this.knownUpgrades[plugin.name]!)
    }

    showPluginInfo (plugin: PluginInfo) {
        this.electron.shell.openExternal('https://www.npmjs.com/package/' + plugin.packageName)
    }

    enablePlugin (plugin: PluginInfo) {
        this.config.store.pluginBlacklist = this.config.store.pluginBlacklist.filter(x => x !== plugin.name)
        this.config.save()
        this.config.requestRestart()
    }

    disablePlugin (plugin: PluginInfo) {
        this.config.store.pluginBlacklist = [...this.config.store.pluginBlacklist, plugin.name]
        this.config.save()
        this.config.requestRestart()
    }
}
