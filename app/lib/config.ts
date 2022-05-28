import * as fs from 'mz/fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { v4 as uuidv4 } from 'uuid'
import * as gracefulFS from 'graceful-fs'
import { app } from 'electron'
import { promisify } from 'util'

export async function migrateConfig (): Promise<void> {
    const configPath = path.join(app.getPath('userData'), 'config.yaml')
    const legacyConfigPath = path.join(app.getPath('userData'), '../terminus', 'config.yaml')
    if (await fs.exists(legacyConfigPath) && (
        !await fs.exists(configPath) ||
        (await fs.stat(configPath)).mtime < (await fs.stat(legacyConfigPath)).mtime
    )) {
        await fs.writeFile(configPath, await fs.readFile(legacyConfigPath))
    }
}

export async function loadConfig (): Promise<any> {
    await migrateConfig()

    const configPath = path.join(app.getPath('userData'), 'config.yaml')
    if (await fs.exists(configPath)) {
        return yaml.load(await fs.readFile(configPath, 'utf8'))
    } else {
        return {}
    }
}

const configPath = path.join(app.getPath('userData'), 'config.yaml')
let _configSaveInProgress = Promise.resolve()

async function _saveConfigInternal (content: string): Promise<void> {
    const tempPath = configPath + '.new.' + uuidv4().toString()
    await fs.writeFile(tempPath, content, 'utf8')
    await fs.writeFile(configPath + '.backup', content, 'utf8')
    await promisify(gracefulFS.rename)(tempPath, configPath)
}

export async function saveConfig (content: string): Promise<void> {
    try {
        await _configSaveInProgress
    } catch { }
    _configSaveInProgress = _saveConfigInternal(content)
    await _configSaveInProgress
}
