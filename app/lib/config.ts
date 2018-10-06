import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { app } from 'electron'

export function loadConfig (): any {
    let configPath = path.join(app.getPath('userData'), 'config.yaml')
    if (fs.existsSync(configPath)) {
        return yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))
    } else {
        return {}
    }
}
