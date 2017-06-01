import { BehaviorSubject, Observable } from 'rxjs'
import * as fs from 'fs-promise'
import * as path from 'path'
import * as semver from 'semver'
import { exec } from 'mz/child_process'

import { Component, Inject, ChangeDetectionStrategy } from '@angular/core'
import { IPluginInfo, PluginManagerService } from '../services/pluginManager.service'

@Component({
    template: require('./pluginsSettingsTab.component.pug'),
    styles: [require('./pluginsSettingsTab.component.scss')],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginsSettingsTabComponent {
    availablePlugins$: Observable<IPluginInfo[]>
    availablePluginsQuery$ = new BehaviorSubject<string>('')
    availablePluginsReady = false
    knownUpgrades: {[id: string]: IPluginInfo} = {}
    busy: boolean

    constructor (
        public pluginManager: PluginManagerService
    ) {
    }

    ngOnInit () {
        this.availablePlugins$ = this.availablePluginsQuery$
            .debounceTime(200)
            .distinctUntilChanged()
            .flatMap(query => {
                this.availablePluginsReady = false
                return this.pluginManager.listAvailable(query).do(() => {
                    this.availablePluginsReady = true
                })
            })
        this.availablePlugins$.first().subscribe(available => {
            for (let plugin of this.pluginManager.installedPlugins) {
                this.knownUpgrades[plugin.name] = available.find(x => x.name === plugin.name && semver.gt(x.version, plugin.version))
            }
        })
    }

    isAlreadyInstalled (plugin: IPluginInfo): boolean {
        return this.pluginManager.installedPlugins.some(x => x.name === plugin.name)
    }

    async installPlugin (plugin: IPluginInfo): Promise<void> {
        this.busy = true
    }

    async upgradePlugin (plugin: IPluginInfo): Promise<void> {
        return this.installPlugin(this.knownUpgrades[plugin.name])
    }
}
