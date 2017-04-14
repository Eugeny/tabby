import * as yaml from 'js-yaml'
import * as path from 'path'
import * as fs from 'fs'
import { EventEmitter, Injectable, Inject } from '@angular/core'
import { ElectronService } from '../services/electron'
import { ConfigProvider } from '../api/configProvider'


export class ConfigProxy {
    constructor (real: any, defaults: any, structure: any) {
        for (let key in structure) {
            if (!real[key]) {
                real[key] = {}
            }
            let proxy = new ConfigProxy(real[key], defaults[key], structure[key])
            Object.defineProperty(
                this,
                key,
                {
                    enumerable: true,
                    configurable: false,
                    get: () => {
                        return proxy
                    },
                }
            )
        }
        for (let key in defaults) {
            if (structure[key]) {
                continue
            }
            Object.defineProperty(
                this,
                key,
                {
                    enumerable: true,
                    configurable: false,
                    get: () => {
                        return real[key] || defaults[key]
                    },
                    set: (value) => {
                        real[key] = value
                    }
                }
            )
        }
    }
}


const configMerge = (a, b) => require('deepmerge')(a, b, { arrayMerge: (_d, s) => s })


@Injectable()
export class ConfigService {
    store: ConfigProxy
    change = new EventEmitter()
    restartRequested: boolean
    private _store: any
    private path: string
    private configStructure: any = require('../defaultConfigStructure.yaml')
    private defaultConfigValues: any = require('../defaultConfigValues.yaml')

    constructor (
        electron: ElectronService,
        @Inject(ConfigProvider) configProviders: ConfigProvider[],
    ) {
        this.path = path.join(electron.app.getPath('userData'), 'config.yaml')
        this.configStructure = configProviders.map(x => x.configStructure).reduce(configMerge, this.configStructure)
        this.defaultConfigValues = configProviders.map(x => x.defaultConfigValues).reduce(configMerge, this.defaultConfigValues)
        this.load()
    }

    load (): void {
        if (fs.existsSync(this.path)) {
            this._store = yaml.safeLoad(fs.readFileSync(this.path, 'utf8'))
        } else {
            this._store = {}
        }
        this.store = new ConfigProxy(this._store, this.defaultConfigValues, this.configStructure)
    }

    save (): void {
        fs.writeFileSync(this.path, yaml.safeDump(this._store), 'utf8')
        this.emitChange()
    }

    full (): any {
        return configMerge(this.defaultConfigValues, this._store)
    }

    emitChange (): void {
        this.change.emit()
    }

    requestRestart (): void {
        this.restartRequested = true
    }
}
