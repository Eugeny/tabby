import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { writeFile } from 'atomically'


export const configPath = path.join(process.env.CONFIG_DIRECTORY!, 'config.yaml')
const legacyConfigPath = path.join(process.env.CONFIG_DIRECTORY!, '../terminus', 'config.yaml')


export function migrateConfig (): void {
    if (fs.existsSync(legacyConfigPath) && (
        !fs.existsSync(configPath) ||
        fs.statSync(configPath).mtime < fs.statSync(legacyConfigPath).mtime
    )) {
        fs.writeFileSync(configPath, fs.readFileSync(legacyConfigPath))
    }
}

export function loadConfig (): any {
    migrateConfig()

    if (fs.existsSync(configPath)) {
        return yaml.load(fs.readFileSync(configPath, 'utf8'))
    } else {
        return {}
    }
}

export async function saveConfig (content: string): Promise<void> {
    await writeFile(configPath, content, { encoding: 'utf8' })
    await writeFile(configPath + '.backup', content, { encoding: 'utf8' })
}