import * as yaml from 'js-yaml'
import * as path from 'path'
import * as fs from 'fs'
import { EventEmitter, Injectable } from '@angular/core'
import { ElectronService } from 'services/electron'

const configMerge = (a, b) => require('deepmerge')(a, b, { arrayMerge: (_d, s) => s })
const defaultConfigValues : IConfigData = require('../../defaultConfigValues.yaml')
const defaultConfigStructure : IConfigData = require('../../defaultConfigStructure.yaml')

export interface IAppearanceData {
    font: string
    fontSize: number
}

export interface IConfigData {
    appearance?: IAppearanceData
    hotkeys?: any
}

@Injectable()
export class ConfigService {
    constructor (
        electron: ElectronService
    ) {
        this.path = path.join(electron.app.getPath('userData'), 'config.yaml')
        this.load()
    }

    private path: string
    store: IConfigData
    change = new EventEmitter()

    load () {
        if (fs.existsSync(this.path)) {
            this.store = configMerge(defaultConfigStructure, yaml.safeLoad(fs.readFileSync(this.path, 'utf8')))
        } else {
            this.store = Object.assign({}, defaultConfigStructure)
        }
    }

    save () {
        fs.writeFileSync(this.path, yaml.safeDump(this.store), 'utf8')
        this.emitChange()
    }

    full () : IConfigData {
        return configMerge(defaultConfigValues, this.store)
    }

    emitChange () {
        this.change.emit()
    }
}
