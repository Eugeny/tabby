import * as yaml from 'js-yaml'
import * as path from 'path'
import * as fs from 'fs'
import { Injectable } from '@angular/core'
import { ElectronService } from 'services/electron'

const defaultConfig : IConfigData = require('../../defaultConfig.yaml')

export interface IConfigData {
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
    private store: IConfigData

    load () {
        if (fs.existsSync(this.path)) {
            this.store = yaml.safeLoad(fs.readFileSync(this.path, 'utf8'))
        } else {
            this.store = {}
        }
    }

    save () {
        fs.writeFileSync(this.path, yaml.safeDump(this.store), 'utf8')
    }

    full () : IConfigData {
        return Object.assign({}, defaultConfig, this.store)
    }
}
