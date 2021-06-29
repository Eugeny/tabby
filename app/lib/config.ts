import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { app } from 'electron'

export function migrateConfig (): void {
    const configPath = path.join(app.getPath('userData'), 'config.yaml')
    const legacyConfigPath = path.join(app.getPath('userData'), '../terminus', 'config.yaml')
    if (fs.existsSync(legacyConfigPath) && (
        !fs.existsSync(configPath) ||
        fs.statSync(configPath).mtime < fs.statSync(legacyConfigPath).mtime
    )) {
        fs.writeFileSync(configPath, fs.readFileSync(legacyConfigPath))
    }
}

export function loadConfig (): any {
    migrateConfig()

    const configPath = path.join(app.getPath('userData'), 'config.yaml')
    if (fs.existsSync(configPath)) {
        return yaml.load(fs.readFileSync(configPath, 'utf8'))
    } else {
        return {}
    }
}
