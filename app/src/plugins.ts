import * as fs from 'fs-promise'
import * as path from 'path'
const nodeModule = require('module')
const nodeRequire = (global as any).require

function normalizePath (path: string): string {
    const cygwinPrefix = '/cygdrive/'
    if (path.startsWith(cygwinPrefix)) {
        path = path.substring(cygwinPrefix.length).replace('/', '\\')
        path = path[0] + ':' + path.substring(1)
    }
    return path
}

nodeRequire.main.paths.map(x => nodeModule.globalPaths.push(normalizePath(x)))

if (process.env.DEV) {
    nodeModule.globalPaths.unshift(path.dirname(require('electron').remote.app.getAppPath()))
}

const builtinPluginsPath = path.join(
    path.dirname(require('electron').remote.app.getPath('exe')),
    (process.platform === 'darwin') ? '../Resources' : 'resources',
    'builtin-plugins',
)

const userPluginsPath = path.join(
    require('electron').remote.app.getPath('appData'),
    'terminus',
    'plugins',
)

Object.assign(window, { builtinPluginsPath, userPluginsPath })
nodeModule.globalPaths.unshift(builtinPluginsPath)
nodeModule.globalPaths.unshift(path.join(userPluginsPath, 'node_modules'))

if (process.env.TERMINUS_PLUGINS) {
    process.env.TERMINUS_PLUGINS.split(':').map(x => nodeModule.globalPaths.unshift(normalizePath(x)))
}

export declare type ProgressCallback = (current, total) => void

export interface IPluginInfo {
    name: string
    description: string
    packageName: string
    isBuiltin: boolean
    version: string
    homepage?: string
    path?: string
    info?: any
}

export async function findPlugins (): Promise<IPluginInfo[]> {
    let paths = nodeModule.globalPaths
    let foundPlugins: IPluginInfo[] = []

    for (let pluginDir of paths) {
        pluginDir = normalizePath(pluginDir)
        if (!await fs.exists(pluginDir)) {
            continue
        }
        let pluginNames = await fs.readdir(pluginDir)
        for (let pluginName of pluginNames.filter(x => /^terminus-/.exec(x))) {
            let pluginPath = path.join(pluginDir, pluginName)
            let infoPath = path.join(pluginPath, 'package.json')
            if (!await fs.exists(infoPath)) {
                continue
            }

            if (foundPlugins.some(x => x.name === pluginName)) {
                console.info(`Plugin ${pluginName} already exists`)
            }

            try {
                let info = await fs.readJson(infoPath)
                console.log(pluginDir, builtinPluginsPath)
                foundPlugins.push({
                    name: pluginName.substring('terminus-'.length),
                    packageName: pluginName,
                    isBuiltin: pluginDir === builtinPluginsPath,
                    version: info.version,
                    description: info.description,
                    path: pluginPath,
                    info,
                })
            } catch (error) {
                console.error('Cannot load package info for', pluginName)
            }
        }
    }

    (window as any).installedPlugins = foundPlugins
    return foundPlugins
}

export async function loadPlugins (foundPlugins: IPluginInfo[], progress: ProgressCallback): Promise<any[]> {
    let plugins: any[] = []
    progress(0, 1)
    let index = 0
    for (let foundPlugin of foundPlugins) {
        console.info(`Loading ${foundPlugin.name}: ${nodeRequire.resolve(foundPlugin.path)}`)
        progress(index, foundPlugins.length)
        try {
            let pluginModule = nodeRequire(foundPlugin.path)
            plugins.push(pluginModule)
        } catch (error) {
            console.error(`Could not load ${foundPlugin.name}:`, error)
        }
        await delay(1)
        index++
    }
    progress(1, 1)
    return plugins
}
