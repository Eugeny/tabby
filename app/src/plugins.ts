import * as fs from 'mz/fs'
import * as path from 'path'
const nodeModule = require('module') // eslint-disable-line @typescript-eslint/no-var-requires
const nodeRequire = (global as any).require

function normalizePath (path: string): string {
    const cygwinPrefix = '/cygdrive/'
    if (path.startsWith(cygwinPrefix)) {
        path = path.substring(cygwinPrefix.length).replace('/', '\\')
        path = path[0] + ':' + path.substring(1)
    }
    return path
}

global['module'].paths.map((x: string) => nodeModule.globalPaths.push(normalizePath(x)))


const builtinPluginsPath = process.env.TERMINUS_DEV ? path.dirname(require('electron').remote.app.getAppPath()) : path.join((process as any).resourcesPath, 'builtin-plugins')

const userPluginsPath = path.join(
    require('electron').remote.app.getPath('appData'),
    'terminus',
    'plugins',
)

if (!fs.existsSync(userPluginsPath)) {
    fs.mkdir(userPluginsPath)
}

Object.assign(window, { builtinPluginsPath, userPluginsPath })
nodeModule.globalPaths.unshift(builtinPluginsPath)
nodeModule.globalPaths.unshift(path.join(userPluginsPath, 'node_modules'))
// nodeModule.globalPaths.unshift(path.join((process as any).resourcesPath, 'app.asar', 'node_modules'))
if (process.env.TERMINUS_PLUGINS) {
    process.env.TERMINUS_PLUGINS.split(':').map(x => nodeModule.globalPaths.push(normalizePath(x)))
}

export type ProgressCallback = (current: number, total: number) => void // eslint-disable-line @typescript-eslint/no-type-alias

export interface PluginInfo {
    name: string
    description: string
    packageName: string
    isBuiltin: boolean
    version: string
    author: string
    homepage?: string
    path?: string
    info?: any
}

export async function findPlugins (): Promise<PluginInfo[]> {
    const paths = nodeModule.globalPaths
    let foundPlugins: PluginInfo[] = []
    const candidateLocations: { pluginDir: string, packageName: string }[] = []
    const PREFIX = 'terminus-'

    for (let pluginDir of paths) {
        pluginDir = normalizePath(pluginDir)
        if (!await fs.exists(pluginDir)) {
            continue
        }
        const pluginNames = await fs.readdir(pluginDir)
        if (await fs.exists(path.join(pluginDir, 'package.json'))) {
            candidateLocations.push({
                pluginDir: path.dirname(pluginDir),
                packageName: path.basename(pluginDir),
            })
        }
        for (const packageName of pluginNames) {
            if (packageName.startsWith(PREFIX)) {
                candidateLocations.push({ pluginDir, packageName })
            }
        }
    }

    for (const { pluginDir, packageName } of candidateLocations) {
        const pluginPath = path.join(pluginDir, packageName)
        const infoPath = path.join(pluginPath, 'package.json')
        if (!await fs.exists(infoPath)) {
            continue
        }

        const name = packageName.substring(PREFIX.length)

        if (foundPlugins.some(x => x.name === name)) {
            console.info(`Plugin ${packageName} already exists, overriding`)
            foundPlugins = foundPlugins.filter(x => x.name !== name)
        }

        try {
            const info = JSON.parse(await fs.readFile(infoPath, { encoding: 'utf-8' }))
            if (!info.keywords || !(info.keywords.includes('terminus-plugin') || info.keywords.includes('terminus-builtin-plugin'))) {
                continue
            }
            let author = info.author
            author = author.name || author
            foundPlugins.push({
                name: name,
                packageName: packageName,
                isBuiltin: pluginDir === builtinPluginsPath,
                version: info.version,
                description: info.description,
                author,
                path: pluginPath,
                info,
            })
        } catch (error) {
            console.error('Cannot load package info for', packageName)
        }
    }

    foundPlugins.sort((a, b) => a.name > b.name ? 1 : -1)

    ;(window as any).installedPlugins = foundPlugins
    return foundPlugins
}

export async function loadPlugins (foundPlugins: PluginInfo[], progress: ProgressCallback): Promise<any[]> {
    const plugins: any[] = []
    progress(0, 1)
    let index = 0
    for (const foundPlugin of foundPlugins) {
        if (foundPlugin.name !== 'core') continue
        console.info(`Loading ${foundPlugin.name}: ${nodeRequire.resolve(foundPlugin.path)}`)
        progress(index, foundPlugins.length)
        try {
            const label = 'Loading ' + foundPlugin.name
            console.time(label)
            const packageModule = nodeRequire(foundPlugin.path)
            const pluginModule = packageModule.default.forRoot ? packageModule.default.forRoot() : packageModule.default
            pluginModule['pluginName'] = foundPlugin.name
            pluginModule['bootstrap'] = packageModule.bootstrap
            plugins.push(pluginModule)
            console.timeEnd(label)
            await new Promise(x => setTimeout(x, 50))
        } catch (error) {
            console.error(`Could not load ${foundPlugin.name}:`, error)
        }
        index++
    }
    progress(1, 1)
    return plugins
}
