import axios from 'axios'
import { compare as semverCompare } from 'semver'
import { Observable, from, forkJoin, map, of, catchError } from 'rxjs'
import { Injectable, Inject } from '@angular/core'
import { Logger, LogService, PlatformService, BOOTSTRAP_DATA, BootstrapData, PluginInfo } from 'tabby-core'
import { PLUGIN_BLACKLIST } from '../../../app/src/pluginBlacklist'

const OFFICIAL_NPM_ACCOUNT = 'eugenepankov'


@Injectable({ providedIn: 'root' })
export class PluginManagerService {
    logger: Logger
    userPluginsPath: string
    installedPlugins: PluginInfo[]

    private constructor (
        log: LogService,
        private platform: PlatformService,
        @Inject(BOOTSTRAP_DATA) bootstrapData: BootstrapData,
    ) {
        this.logger = log.create('pluginManager')
        this.installedPlugins = [...bootstrapData.installedPlugins]
        this.installedPlugins.sort((a, b) => a.name.localeCompare(b.name))
        this.userPluginsPath = bootstrapData.userPluginsPath
    }

    listAvailable (query?: string): Observable<PluginInfo[]> {
        return forkJoin(
            this._listAvailableInternal('tabby-', 'tabby-plugin', query),
            this._listAvailableInternal('terminus-', 'terminus-plugin', query),
            this._fetchExactPlugin(query),
        ).pipe(
            map(x => x.reduce((a, b) => a.concat(b), [])),
            map(x => x.sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0))),
            map(x => {
                const names = new Set<string>()
                return x.filter(item => {
                    if (names.has(item.name)) {
                        return false
                    }
                    names.add(item.name)
                    return true
                })
            }),
        )
    }

    listInstalled (query: string): Observable<PluginInfo[]> {
        return of(this.installedPlugins.filter(x=>x.name.includes(query)))
    }

    _listAvailableInternal (namePrefix: string, keyword: string, query?: string): Observable<PluginInfo[]> {
        return from(
            axios.get(`https://registry.npmjs.com/-/v1/search?text=keywords%3A${keyword}%20${query}&size=250`),
        ).pipe(
            map(response => response.data.objects
                .filter(item => !item.keywords?.includes('tabby-dummy-transition-plugin'))
                .map(item => ({
                    name: item.package.name.substring(namePrefix.length),
                    packageName: item.package.name,
                    description: item.package.description,
                    version: item.package.version,
                    homepage: item.package.links.homepage,
                    author: item.package.author?.name,
                    isOfficial: item.package.publisher.username === OFFICIAL_NPM_ACCOUNT,
                    searchScore: item.searchScore ?? 0,
                })),
            ),
            map(plugins => plugins.filter(x => x.packageName.startsWith(namePrefix))),
            map(plugins => plugins.filter(x => !PLUGIN_BLACKLIST.includes(x.packageName))),
            map(plugins => {
                const mapping: Record<string, PluginInfo[]> = {}
                for (const p of plugins) {
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    mapping[p.name] ??= []
                    mapping[p.name].push(p)
                }
                return Object.values(mapping).map(list => {
                    list.sort((a, b) => -semverCompare(a.version, b.version))
                    return list[0]
                })
            }),
        )
    }

    _fetchExactPlugin (query?: string): Observable<PluginInfo[]> {
        const trimmed = (query ?? '').trim()
        if (!trimmed) {
            return of([])
        }

        const npmUrlMatch = trimmed.match(/npmjs\.com\/package\/([^/]+)/)
        const packageName = npmUrlMatch ? npmUrlMatch[1] : trimmed

        const candidates = [packageName]
        if (!packageName.startsWith('tabby-') && !packageName.startsWith('terminus-')) {
            candidates.unshift(`tabby-${packageName}`)
        }

        return forkJoin(
            candidates.map(name =>
                from(axios.get(`https://registry.npmjs.com/${encodeURIComponent(name)}/latest`)).pipe(
                    map(response => ({
                        name: response.data.name.replace(/^(tabby-|terminus-)/, ''),
                        packageName: response.data.name,
                        description: response.data.description ?? '',
                        version: response.data.version,
                        homepage: response.data.homepage ?? '',
                        author: typeof response.data.author === 'string'
                            ? response.data.author
                            : response.data.author?.name ?? '',
                        isBuiltin: false,
                        isLegacy: response.data.name.startsWith('terminus-'),
                        isOfficial: false,
                        searchScore: Number.MAX_SAFE_INTEGER,
                    } as PluginInfo)),
                    catchError(() => of(null)),
                ),
            ),
        ).pipe(
            map(results => results.filter((r): r is PluginInfo => r !== null)),
            map(results => results.filter(r => !PLUGIN_BLACKLIST.includes(r.packageName))),
        )
    }

    async installPlugin (plugin: PluginInfo): Promise<void> {
        try {
            await this.platform.installPlugin(plugin.packageName, plugin.version)
            this.installedPlugins = this.installedPlugins.filter(x => x.packageName !== plugin.packageName)
            this.installedPlugins.push(plugin)
        } catch (err) {
            this.logger.error(err)
            throw err
        }
    }

    async uninstallPlugin (plugin: PluginInfo): Promise<void> {
        try {
            await this.platform.uninstallPlugin(plugin.packageName)
            this.installedPlugins = this.installedPlugins.filter(x => x.packageName !== plugin.packageName)
        } catch (err) {
            this.logger.error(err)
            throw err
        }
    }
}
