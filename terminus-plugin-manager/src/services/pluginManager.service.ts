import npm from 'npm'
import axios from 'axios'
import { Observable, from } from 'rxjs'
import { map } from 'rxjs/operators'
import { Injectable } from '@angular/core'
import { Logger, LogService } from 'terminus-core'

const NAME_PREFIX = 'terminus-'
const KEYWORD = 'terminus-plugin'
const OFFICIAL_NPM_ACCOUNT = 'eugenepankov'

export interface IPluginInfo {
    name: string
    description: string
    packageName: string
    isBuiltin: boolean
    isOfficial: boolean
    version: string
    homepage?: string
    author: string
    path?: string
}

@Injectable({ providedIn: 'root' })
export class PluginManagerService {
    logger: Logger
    builtinPluginsPath: string = (window as any).builtinPluginsPath
    userPluginsPath: string = (window as any).userPluginsPath
    installedPlugins: IPluginInfo[] = (window as any).installedPlugins

    private npmReady: Promise<void>

    constructor (
        log: LogService,
    ) {
        this.logger = log.create('pluginManager')
        this.npmReady = new Promise(resolve => {
            npm.load({
                prefix: this.userPluginsPath,
            }, err => {
                if (err) {
                    this.logger.error(err)
                }
                resolve()
            })
        })
    }

    listAvailable (query?: string): Observable<IPluginInfo[]> {
        return from(
            axios.get(`https://www.npmjs.com/search?q=keywords%3A${KEYWORD}+${encodeURIComponent(query || '')}&from=0&size=1000`, {
                headers: {
                    'x-spiferack': '1',
                }
            })
        ).pipe(
            map(response => response.data.objects.map(item => ({
                name: item.package.name.substring(NAME_PREFIX.length),
                packageName: item.package.name,
                description: item.package.description,
                version: item.package.version,
                homepage: item.package.links.homepage,
                author: (item.package.author || {}).name,
                isOfficial: item.package.publisher.username === OFFICIAL_NPM_ACCOUNT,
            }))),
            map(plugins => plugins.filter(x => x.packageName.startsWith(NAME_PREFIX))),
        )
    }

    async installPlugin (plugin: IPluginInfo) {
        await this.npmReady
        npm.commands.install([`${plugin.packageName}@${plugin.version}`], err => {
            if (err) {
                this.logger.error(err)
            }
            this.installedPlugins = this.installedPlugins.filter(x => x.packageName !== plugin.packageName)
            this.installedPlugins.push(plugin)
        })
    }

    async uninstallPlugin (plugin: IPluginInfo) {
        await this.npmReady
        npm.commands.remove([plugin.packageName], err => {
            if (err) {
                this.logger.error(err)
            }
            this.installedPlugins = this.installedPlugins.filter(x => x.packageName !== plugin.packageName)
        })
    }
}
