import { promisify } from 'util'


export class PluginManager {
    npm: any
    npmReady?: Promise<void>

    async ensureLoaded (): Promise<void> {
        if (!this.npmReady) {
            this.npmReady = new Promise(resolve => {
                const npm = require('npm')
                npm.load(err => {
                    if (err) {
                        console.error(err)
                        return
                    }
                    npm.config.set('global', false)
                    this.npm = npm
                    resolve()
                })
            })
        }
        return this.npmReady
    }

    async install (path: string, name: string, version: string): Promise<void> {
        await this.ensureLoaded()
        this.npm.prefix = path
        return promisify(this.npm.commands.install)([`${name}@${version}`])
    }

    async uninstall (path: string, name: string): Promise<void> {
        await this.ensureLoaded()
        this.npm.prefix = path
        return promisify(this.npm.commands.remove)([name])
    }
}


export const pluginManager = new PluginManager()
