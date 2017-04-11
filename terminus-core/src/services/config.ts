import * as yaml from 'js-yaml'
import * as path from 'path'
import * as fs from 'fs'
import { EventEmitter, Injectable, Inject } from '@angular/core'
import { ElectronService } from '../services/electron'
import { ConfigProvider } from '../api/configProvider'

const configMerge = (a, b) => require('deepmerge')(a, b, { arrayMerge: (_d, s) => s })


@Injectable()
export class ConfigService {
    store: any
    change = new EventEmitter()
    restartRequested: boolean
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
            this.store = configMerge(this.configStructure, yaml.safeLoad(fs.readFileSync(this.path, 'utf8')))
        } else {
            this.store = Object.assign({}, this.configStructure)
        }
    }

    save (): void {
        fs.writeFileSync(this.path, yaml.safeDump(this.store), 'utf8')
        this.emitChange()
    }

    full (): any {
        return configMerge(this.defaultConfigValues, this.store)
    }

    emitChange (): void {
        this.change.emit()
    }

    requestRestart (): void {
        this.restartRequested = true
    }
}
