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

export async function loadPlugins (): Promise<any[]> {
    let paths = nodeModule.globalPaths
    let plugins: any[] = []
    for (let pluginDir of paths) {
        pluginDir = normalizePath(pluginDir)
        if (!await fs.exists(pluginDir)) {
            continue
        }
        for (let pluginName of await fs.readdir(pluginDir)) {
            if (/^terminus-/.exec(pluginName)) {
                let pluginPath = path.join(pluginDir, pluginName)
                console.info(`Loading ${pluginName}: ${(<any>global).require.resolve(pluginPath)}`)
                try {
                    let pluginModule = (<any>global).require(pluginPath)
                    plugins.push(pluginModule)
                } catch (error) {
                    console.error(`Could not load ${pluginName}:`, error)
                }
            }
        }
    }
    return plugins
}
