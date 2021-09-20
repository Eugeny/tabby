import * as fs from 'mz/fs'
import * as path from 'path'
import * as remote from '@electron/remote'
import { PluginInfo } from '../../tabby-core/src/api/mainProcess'

const nodeModule = require('module') // eslint-disable-line @typescript-eslint/no-var-requires

const nodeRequire = global['require']

function normalizePath (p: string): string {
    const cygwinPrefix = '/cygdrive/'
    if (p.startsWith(cygwinPrefix)) {
        p = p.substring(cygwinPrefix.length).replace('/', '\\')
        p = p[0] + ':' + p.substring(1)
    }
    return p
}

const builtinPluginsPath = process.env.TABBY_DEV ? path.dirname(remote.app.getAppPath()) : path.join((process as any).resourcesPath, 'builtin-plugins')

const cachedBuiltinModules = {
    '@angular/animations': require('@angular/animations'),
    '@angular/common': require('@angular/common'),
    '@angular/compiler': require('@angular/compiler'),
    '@angular/core': require('@angular/core'),
    '@angular/forms': require('@angular/forms'),
    '@angular/platform-browser': require('@angular/platform-browser'),
    '@angular/platform-browser/animations': require('@angular/platform-browser/animations'),
    '@angular/platform-browser-dynamic': require('@angular/platform-browser-dynamic'),
    '@ng-bootstrap/ng-bootstrap': require('@ng-bootstrap/ng-bootstrap'),
    'ngx-toastr': require('ngx-toastr'),
    rxjs: require('rxjs'),
    'rxjs/operators': require('rxjs/operators'),
    'zone.js/dist/zone.js': require('zone.js/dist/zone.js'),
}

const builtinModules = [
    ...Object.keys(cachedBuiltinModules),
    'tabby-core',
    'tabby-local',
    'tabby-settings',
    'tabby-terminal',
]

const originalRequire = (global as any).require
;(global as any).require = function (query: string) {
    if (cachedBuiltinModules[query]) {
        return cachedBuiltinModules[query]
    }
    return originalRequire.apply(this, [query])
}

const originalModuleRequire = nodeModule.prototype.require
nodeModule.prototype.require = function (query: string) {
    if (cachedBuiltinModules[query]) {
        return cachedBuiltinModules[query]
    }
    return originalModuleRequire.call(this, query)
}

export type ProgressCallback = (current: number, total: number) => void

export function initModuleLookup (userPluginsPath: string): void {
    global['module'].paths.map((x: string) => nodeModule.globalPaths.push(normalizePath(x)))

    nodeModule.globalPaths.unshift(path.join(userPluginsPath, 'node_modules'))

    if (process.env.TABBY_DEV) {
        nodeModule.globalPaths.unshift(path.dirname(remote.app.getAppPath()))
    }

    nodeModule.globalPaths.unshift(builtinPluginsPath)
    // nodeModule.globalPaths.unshift(path.join((process as any).resourcesPath, 'app.asar', 'node_modules'))
    if (process.env.TABBY_PLUGINS) {
        process.env.TABBY_PLUGINS.split(':').map(x => nodeModule.globalPaths.push(normalizePath(x)))
    }

    builtinModules.forEach(m => {
        if (!cachedBuiltinModules[m]) {
            cachedBuiltinModules[m] = nodeRequire(m)
        }
    })
}

export async function findPlugins (): Promise<PluginInfo[]> {
    const paths = nodeModule.globalPaths
    let foundPlugins: PluginInfo[] = []
    const candidateLocations: { pluginDir: string, packageName: string }[] = []
    const PREFIX = 'tabby-'
    const LEGACY_PREFIX = 'terminus-'

    const processedPaths = []

    for (let pluginDir of paths) {
        if (processedPaths.includes(pluginDir)) {
            continue
        }
        processedPaths.push(pluginDir)

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
            if (packageName.startsWith(PREFIX) || packageName.startsWith(LEGACY_PREFIX)) {
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

        const name = packageName.startsWith(PREFIX) ? packageName.substring(PREFIX.length) : packageName.substring(LEGACY_PREFIX.length)

        if (builtinModules.includes(packageName) && pluginDir !== builtinPluginsPath) {
            continue
        }

        console.log(`Found ${name} in ${pluginDir}`)

        const existing = foundPlugins.find(x => x.name === name)
        if (existing) {
            if (existing.isLegacy) {
                console.info(`Plugin ${packageName} already exists, overriding`)
                foundPlugins = foundPlugins.filter(x => x.name !== name)
            } else {
                console.info(`Plugin ${packageName} already exists, skipping`)
                continue
            }
        }

        try {
            const info = JSON.parse(await fs.readFile(infoPath, { encoding: 'utf-8' }))
            if (!info.keywords || !(info.keywords.includes('terminus-plugin') || info.keywords.includes('terminus-builtin-plugin') || info.keywords.includes('tabby-plugin') || info.keywords.includes('tabby-builtin-plugin'))) {
                continue
            }
            let author = info.author
            author = author.name || author
            foundPlugins.push({
                name: name,
                packageName: packageName,
                isBuiltin: pluginDir === builtinPluginsPath,
                isLegacy: info.keywords.includes('terminus-plugin') || info.keywords.includes('terminus-builtin-plugin'),
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
    foundPlugins.sort((a, b) => a.isBuiltin < b.isBuiltin ? 1 : -1)
    return foundPlugins
}

export async function loadPlugins (foundPlugins: PluginInfo[], progress: ProgressCallback): Promise<any[]> {
    const plugins: any[] = []
    progress(0, 1)
    let index = 0
    for (const foundPlugin of foundPlugins) {
        console.info(`Loading ${foundPlugin.name}: ${nodeRequire.resolve(foundPlugin.path)}`)
        progress(index, foundPlugins.length)
        try {
            const packageModule = nodeRequire(foundPlugin.path)
            if (foundPlugin.packageName.startsWith('tabby-')) {
                cachedBuiltinModules[foundPlugin.packageName.replace('tabby-', 'terminus-')] = packageModule
            }
            const pluginModule = packageModule.default.forRoot ? packageModule.default.forRoot() : packageModule.default
            pluginModule.pluginName = foundPlugin.name
            pluginModule.bootstrap = packageModule.bootstrap
            plugins.push(pluginModule)
            await new Promise(x => setTimeout(x, 50))
        } catch (error) {
            console.error(`Could not load ${foundPlugin.name}:`, error)
        }
        index++
    }
    progress(1, 1)
    return plugins
}
