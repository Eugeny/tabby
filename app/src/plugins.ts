import * as fs from 'fs-promise'
import * as path from 'path'

let nodeRequire = (<any>global).require
let module = nodeRequire('module')
nodeRequire.main.paths.map(x => module.globalPaths.push(x))
if (process.env.TERMINUS_PLUGINS) {
    process.env.TERMINUS_PLUGINS.split(':').map(x => module.globalPaths.unshift(x))
}

export async function loadPlugins (): Promise<any[]> {
    let paths = module.globalPaths
    let plugins: any[] = []
    for (let pluginDir of paths) {
        if (!await fs.exists(pluginDir)) {
            continue
        }
        for (let pluginName of await fs.readdir(pluginDir)) {
            if (/^terminus-/.exec(pluginName)) {
                let pluginPath = path.join(pluginDir, pluginName)
                console.info(`Loading ${pluginName}: ${nodeRequire.resolve(pluginPath)}`)
                try {
                    let pluginModule = nodeRequire(pluginPath)
                    plugins.push(pluginModule)
                } catch (error) {
                    console.error(`Could not load ${pluginName}:`, error)
                }
            }
        }
    }
    return plugins
}
