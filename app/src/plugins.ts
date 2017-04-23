import * as fs from 'fs-promise'
import * as path from 'path'
const nodeModule = (<any>global).require('module')

function normalizePath (path: string): string {
    const cygwinPrefix = '/cygdrive/'
    if (path.startsWith(cygwinPrefix)) {
        path = path.substring(cygwinPrefix.length).replace('/', '\\')
        path = path[0] + ':' + path.substring(1)
    }
    return path
};

(<any>global).require.main.paths.map(x => nodeModule.globalPaths.push(normalizePath(x)))

if (process.env.TERMINUS_PLUGINS) {
    process.env.TERMINUS_PLUGINS.split(':').map(x => nodeModule.globalPaths.unshift(normalizePath(x)))
}

export declare type ProgressCallback = (current, total) => void

interface IFoundPlugin {
    name: string
    path: string
}

export async function loadPlugins (progress: ProgressCallback): Promise<any[]> {
    let paths = nodeModule.globalPaths
    let plugins: any[] = []
    let foundPlugins: IFoundPlugin[] = []

    progress(0, 1)
    for (let pluginDir of paths) {
        pluginDir = normalizePath(pluginDir)
        if (!await fs.exists(pluginDir)) {
            continue
        }
        let pluginNames = await fs.readdir(pluginDir)
        pluginNames.filter(pluginName => /^terminus-/.exec(pluginName)).forEach(name => {
            foundPlugins.push({ name, path: path.join(pluginDir, name) })
        })
    }
    foundPlugins.forEach((foundPlugin, index) => {
        console.info(`Loading ${foundPlugin.name}: ${(<any>global).require.resolve(foundPlugin.path)}`)
        progress(index, foundPlugins.length)
        try {
            let pluginModule = (<any>global).require(foundPlugin.path)
            plugins.push(pluginModule)
        } catch (error) {
            console.error(`Could not load ${foundPlugin.name}:`, error)
        }
    })

    progress(1, 1)
    return plugins
}
