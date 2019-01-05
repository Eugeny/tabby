import * as path from 'path'
import * as fs from 'mz/fs'
import { exec } from 'mz/child_process'
import axios from 'axios'
import { Observable, from } from 'rxjs'
import { map } from 'rxjs/operators'
import { Injectable } from '@angular/core'
import { Logger, LogService, ConfigService, HostAppService, Platform } from 'terminus-core'

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
    npmPath: string
    private envPath: string

    constructor (
        log: LogService,
        private config: ConfigService,
        private hostApp: HostAppService,
    ) {
        this.logger = log.create('pluginManager')
        this.detectPath()
    }

    async detectPath () {
        this.npmPath = this.config.store.npm
        this.envPath = process.env.PATH
        if (await fs.exists(this.npmPath)) {
            return
        }
        if (this.hostApp.platform !== Platform.Windows) {
            this.envPath = (await exec('$SHELL -i -c \'echo $PATH\''))[0].toString().trim()
            let searchPaths = this.envPath.split(':')
            for (let searchPath of searchPaths) {
                if (await fs.exists(path.join(searchPath, 'npm'))) {
                    this.logger.debug('Found npm in', searchPath)
                    this.npmPath = path.join(searchPath, 'npm')
                    return
                }
            }
        }
    }

    async isNPMInstalled (): Promise<boolean> {
        await this.detectPath()
        try {
            await exec(`${this.npmPath} -v`, { env: this.getEnv() })
            return true
        } catch (_) {
            return false
        }
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
        await exec(`${this.npmPath} --prefix "${this.userPluginsPath}" install ${plugin.packageName}@${plugin.version}`, { env: this.getEnv() })
        this.installedPlugins = this.installedPlugins.filter(x => x.packageName !== plugin.packageName)
        this.installedPlugins.push(plugin)
    }

    async uninstallPlugin (plugin: IPluginInfo) {
        await exec(`${this.npmPath} --prefix "${this.userPluginsPath}" remove ${plugin.packageName}`, { env: this.getEnv() })
        this.installedPlugins = this.installedPlugins.filter(x => x.packageName !== plugin.packageName)
    }

    private getEnv (): any {
        return Object.assign(process.env, { PATH: this.envPath })
    }
}
