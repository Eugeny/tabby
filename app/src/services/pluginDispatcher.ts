import { Injectable } from '@angular/core'
import { ConfigService } from 'services/config'
import { ElectronService } from 'services/electron'


@Injectable()
export class PluginDispatcherService {
    plugins = []

    constructor (
        private config: ConfigService,
        private electron: ElectronService,
    ) {
    }

    register (plugin) {
        if (!this.plugins.includes(plugin)) {
            this.plugins.push(new plugin({
                config: this.config,
                electron: this.electron,
            }))
        }
    }

    emit (event: string, parameters: any) {
        this.plugins.forEach((plugin) => {
            if (plugin[event]) {
                plugin[event].bind(plugin)(parameters)
            }
        })
    }
}
