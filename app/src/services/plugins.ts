import { IPlugin } from 'api'
import { Injectable } from '@angular/core'


interface IPluginEntry {
    plugin: IPlugin
    weight: number
}

@Injectable()
export class PluginsService {
    plugins: {[type: string]: IPluginEntry[]} = {}

    constructor (
    ) {
    }

    register (type: string, plugin: IPlugin, weight = 0): void {
        if (!this.plugins[type]) {
            this.plugins[type] = []
        }
        this.plugins[type].push({ plugin, weight })
    }

    getAll<T extends IPlugin> (type: string): T[] {
        let plugins = this.plugins[type] || []
        plugins = plugins.sort((a: IPluginEntry, b: IPluginEntry) => {
            if (a.weight < b.weight) {
                return -1
            } else if (a.weight > b.weight) {
                return 1
            }
            return 0
        })
        return plugins.map((x) => <T>(x.plugin))
    }

    emit (type: string, event: string, parameters: any[]) {
        (this.plugins[type] || []).forEach((entry) => {
            if (entry.plugin[event]) {
                entry.plugin[event].bind(entry.plugin)(parameters)
            }
        })
    }
}
