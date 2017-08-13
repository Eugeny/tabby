import * as fs from 'mz/fs'
import * as path from 'path'
const nodeModule = require('module')
const nodeRequire = (global as any).require

declare function delay (ms: number): Promise<void>

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

const builtinPluginsPath = process.env.DEV ? path.dirname(require('electron').remote.app.getAppPath()) : path.join((process as any).resourcesPath, 'builtin-plugins')

const userPluginsPath = path.join(
    require('electron').remote.app.getPath('appData'),
    'terminus',
    'plugins',
)

Object.assign(window, { builtinPluginsPath, userPluginsPath })
nodeModule.globalPaths.unshift(builtinPluginsPath)
nodeModule.globalPaths.unshift(path.join(userPluginsPath, 'node_modules'))
// nodeModule.globalPaths.unshift(path.join((process as any).resourcesPath, 'app.asar', 'node_modules'))
if (process.env.TERMINUS_PLUGINS) {
    process.env.TERMINUS_PLUGINS.split(':').map(x => nodeModule.globalPaths.push(normalizePath(x)))
}

export declare type ProgressCallback = (current, total) => void

export interface IPluginInfo {
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

const builtinModules = [
    '@angular/animations',
    '@angular/common',
    '@angular/compiler',
    '@angular/core',
    '@angular/forms',
    '@angular/platform-browser',
    '@angular/platform-browser-dynamic',
    '@ng-bootstrap/ng-bootstrap',
    'rxjs',
    'terminus-core',
    'terminus-settings',
    'terminus-terminal',
    'zone.js/dist/zone.js',
]

const cachedBuiltinModules = {}
builtinModules.forEach(m => {
    cachedBuiltinModules[m] = nodeRequire(m)
})

const originalRequire = nodeRequire('module').prototype.require
nodeRequire('module').prototype.require = function (query) {
    if (cachedBuiltinModules[query]) {
        return cachedBuiltinModules[query]
    }
    return originalRequire.apply(this, arguments)
}

export async function findPlugins (): Promise<IPluginInfo[]> {
    let paths = nodeModule.globalPaths
    let foundPlugins: IPluginInfo[] = []
    let candidateLocations: { pluginDir: string, pluginName: string }[] = []

    for (let pluginDir of paths) {
        pluginDir = normalizePath(pluginDir)
        if (!await fs.exists(pluginDir)) {
            continue
        }
        let pluginNames = await fs.readdir(pluginDir)
        if (await fs.exists(path.join(pluginDir, 'package.json'))) {
            candidateLocations.push({
                pluginDir: path.dirname(pluginDir),
                pluginName: path.basename(pluginDir)
            })
        }
        for (let pluginName of pluginNames) {
            candidateLocations.push({ pluginDir, pluginName })
        }
    }

    for (let { pluginDir, pluginName } of candidateLocations) {
        let pluginPath = path.join(pluginDir, pluginName)
        let infoPath = path.join(pluginPath, 'package.json')
        if (!await fs.exists(infoPath)) {
            continue
        }

        if (foundPlugins.some(x => x.name === pluginName.substring('terminus-'.length))) {
            console.info(`Plugin ${pluginName} already exists, overriding`)
            foundPlugins = foundPlugins.filter(x => x.name !== pluginName.substring('terminus-'.length))
        }

        try {
            let info = JSON.parse(await fs.readFile(infoPath, {encoding: 'utf-8'}))
            if (!info.keywords || info.keywords.indexOf('terminus-plugin') === -1) {
                continue
            }
            let author = info.author
            author = author.name || author
            foundPlugins.push({
                name: pluginName.substring('terminus-'.length),
                packageName: pluginName,
                isBuiltin: pluginDir === builtinPluginsPath,
                version: info.version,
                description: info.description,
                author,
                path: pluginPath,
                info,
            })
        } catch (error) {
            console.error('Cannot load package info for', pluginName)
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
