import { Observable, Subject } from 'rxjs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import * as fs from 'fs'
import { Injectable, Inject } from '@angular/core'
import { ConfigProvider } from '../api/configProvider'
import { ElectronService } from './electron.service'
import { HostAppService } from './hostApp.service'

const configMerge = (a, b) => require('deepmerge')(a, b, { arrayMerge: (_d, s) => s })

function isStructuralMember (v) {
    return v instanceof Object && !(v instanceof Array) &&
        Object.keys(v).length > 0 && !v.__nonStructural
}

function isNonStructuralObjectMember (v) {
    return v instanceof Object && !(v instanceof Array) && v.__nonStructural
}

/** @hidden */
export class ConfigProxy {
    constructor (real: any, defaults: any) {
        for (let key in defaults) {
            if (isStructuralMember(defaults[key])) {
                if (!real[key]) {
                    real[key] = {}
                }
                let proxy = new ConfigProxy(real[key], defaults[key])
                Object.defineProperty(
                    this,
                    key,
                    {
                        enumerable: true,
                        configurable: false,
                        get: () => proxy,
                    }
                )
            } else {
                Object.defineProperty(
                    this,
                    key,
                    {
                        enumerable: true,
                        configurable: false,
                        get: () => this.getValue(key),
                        set: (value) => {
                            this.setValue(key, value)
                        }
                    }
                )
            }
        }

        this.getValue = (key: string) => {
            if (real[key] !== undefined) {
                return real[key]
            } else {
                if (isNonStructuralObjectMember(defaults[key])) {
                    real[key] = { ...defaults[key] }
                    delete real[key].__nonStructural
                    return real[key]
                } else {
                    return defaults[key]
                }
            }
        }

        this.setValue = (key: string, value: any) => {
            real[key] = value
        }
    }

    getValue (key: string): any { } // tslint:disable-line
    setValue (key: string, value: any) { } // tslint:disable-line
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
    /**
     * Contains the actual config values
     */
    store: any

    /**
     * Whether an app restart is required due to recent changes
     */
    restartRequested: boolean

    /**
     * Full config file path
     */
    path: string

    private changed = new Subject<void>()
    private _store: any
    private defaults: any
    private servicesCache: { [id: string]: Function[] } = null

    get changed$ (): Observable<void> { return this.changed }

    /** @hidden */
    constructor (
        electron: ElectronService,
        private hostApp: HostAppService,
        @Inject(ConfigProvider) configProviders: ConfigProvider[],
    ) {
        this.path = path.join(electron.app.getPath('userData'), 'config.yaml')
        this.defaults = configProviders.map(provider => {
            let defaults = {}
            if (provider.platformDefaults) {
                defaults = configMerge(defaults, provider.platformDefaults[hostApp.platform] || {})
            }
            if (provider.defaults) {
                defaults = configMerge(defaults, provider.defaults)
            }
            return defaults
        }).reduce(configMerge)
        this.load()

        hostApp.configChangeBroadcast$.subscribe(() => {
            this.load()
            this.emitChange()
        })
    }

    getDefaults () {
        return this.defaults
    }

    load (): void {
        if (fs.existsSync(this.path)) {
            this._store = yaml.safeLoad(fs.readFileSync(this.path, 'utf8'))
        } else {
            this._store = {}
        }
        this.store = new ConfigProxy(this._store, this.defaults)
    }

    save (): void {
        fs.writeFileSync(this.path, yaml.safeDump(this._store), 'utf8')
        this.emitChange()
        this.hostApp.broadcastConfigChange()
    }

    /**
     * Reads config YAML as string
     */
    readRaw (): string {
        return yaml.safeDump(this._store)
    }

    /**
     * Writes config YAML as string
     */
    writeRaw (data: string): void {
        this._store = yaml.safeLoad(data)
        this.save()
        this.load()
        this.emitChange()
    }

    private emitChange (): void {
        this.changed.next()
    }

    requestRestart (): void {
        this.restartRequested = true
    }

    /**
     * Filters a list of Angular services to only include those provided
     * by plugins that are enabled
     *
     * @typeparam T Base provider type
     */
    enabledServices<T> (services: T[]): T[] {
        if (!this.servicesCache) {
            this.servicesCache = {}
            let ngModule = window['rootModule'].ngInjectorDef
            for (let imp of ngModule.imports) {
                let module = (imp['ngModule'] || imp)
                if (module.ngInjectorDef && module.ngInjectorDef.providers) {
                    this.servicesCache[module['pluginName']] = module.ngInjectorDef.providers.map(provider => {
                        return provider['useClass'] || provider
                    })
                }
            }
        }
        return services.filter(service => {
            for (let pluginName in this.servicesCache) {
                if (this.servicesCache[pluginName].includes(service.constructor)) {
                    return !this.store.pluginBlacklist.includes(pluginName)
                }
            }
            return true
        })
    }
}
