import deepClone from 'clone-deep'
import deepEqual from 'deep-equal'
import { v4 as uuidv4 } from 'uuid'
import * as yaml from 'js-yaml'
import { Observable, Subject, AsyncSubject } from 'rxjs'
import { Injectable, Inject } from '@angular/core'
import { ConfigProvider } from '../api/configProvider'
import { PlatformService } from '../api/platform'
import { HostAppService } from '../api/hostApp'
import { Vault, VaultService } from './vault.service'
const deepmerge = require('deepmerge')

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const configMerge = (a, b) => deepmerge(a, b, { arrayMerge: (_d, s) => s }) // eslint-disable-line @typescript-eslint/no-var-requires

const LATEST_VERSION = 1

function isStructuralMember (v) {
    return v instanceof Object && !(v instanceof Array) &&
        Object.keys(v).length > 0 && !v.__nonStructural
}

function isNonStructuralObjectMember (v): boolean {
    return v instanceof Object && (v instanceof Array || v.__nonStructural)
}

/** @hidden */
export class ConfigProxy {
    constructor (real: Record<string, any>, defaults: Record<string, any>) {
        for (const key in defaults) {
            if (isStructuralMember(defaults[key])) {
                if (!real[key]) {
                    real[key] = {}
                }
                const proxy = new ConfigProxy(real[key], defaults[key])
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
                        get: () => this.__getValue(key),
                        set: (value) => {
                            this.__setValue(key, value)
                        },
                    }
                )
            }
        }

        this.__getValue = (key: string) => { // eslint-disable-line @typescript-eslint/unbound-method
            if (real[key] !== undefined) {
                return real[key]
            } else {
                if (isNonStructuralObjectMember(defaults[key])) {
                    // The object might be modified outside
                    real[key] = this.__getDefault(key)
                    delete real[key].__nonStructural
                    return real[key]
                }
                return this.__getDefault(key)
            }
        }

        this.__getDefault = (key: string) => { // eslint-disable-line @typescript-eslint/unbound-method
            return deepClone(defaults[key])
        }

        this.__setValue = (key: string, value: any) => { // eslint-disable-line @typescript-eslint/unbound-method
            if (deepEqual(value, this.__getDefault(key))) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete real[key]
            } else {
                real[key] = value
            }
        }

        this.__cleanup = () => { // eslint-disable-line @typescript-eslint/unbound-method
            // Trigger removal of default values
            for (const key in defaults) {
                if (isStructuralMember(defaults[key])) {
                    this[key].__cleanup()
                } else {
                    const v = this.__getValue(key)
                    this.__setValue(key, v)
                }
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
    __getValue (_key: string): any { }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
    __setValue (_key: string, _value: any) { }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
    __getDefault (_key: string): any { }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
    __cleanup () { }
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

    /** Fires once when the config is loaded */
    get ready$ (): Observable<boolean> { return this.ready }

    private ready = new AsyncSubject<boolean>()
    private changed = new Subject<void>()
    private _store: any
    private defaults: any
    private servicesCache: Record<string, Function[]>|null = null // eslint-disable-line @typescript-eslint/ban-types

    get changed$ (): Observable<void> { return this.changed }

    /** @hidden */
    private constructor (
        private hostApp: HostAppService,
        private platform: PlatformService,
        private vault: VaultService,
        @Inject(ConfigProvider) private configProviders: ConfigProvider[],
    ) {
        this.defaults = this.mergeDefaults()
        setTimeout(() => this.init())
        vault.contentChanged$.subscribe(() => {
            this.store.vault = vault.store
            this.save()
        })
    }

    mergeDefaults (): unknown {
        const providers = this.configProviders
        return providers.map(provider => {
            let defaults = provider.platformDefaults[this.hostApp.configPlatform] ?? {}
            defaults = configMerge(
                defaults,
                provider.platformDefaults[this.hostApp.platform] ?? {},
            )
            if (provider.defaults) {
                defaults = configMerge(provider.defaults, defaults)
            }
            return defaults
        }).reduce(configMerge)
    }

    getDefaults (): Record<string, any> {
        const cleanup = o => {
            if (o instanceof Array) {
                return o.map(cleanup)
            } else if (o instanceof Object) {
                const r = {}
                for (const k of Object.keys(o)) {
                    if (k !== '__nonStructural') {
                        r[k] = cleanup(o[k])
                    }
                }
                return r
            } else {
                return o
            }
        }
        return cleanup(this.defaults)
    }

    async load (): Promise<void> {
        const content = await this.platform.loadConfig()
        if (content) {
            this._store = yaml.load(content)
        } else {
            this._store = { version: LATEST_VERSION }
        }
        this._store = await this.maybeDecryptConfig(this._store)
        this.migrate(this._store)
        this.store = new ConfigProxy(this._store, this.defaults)
        this.vault.setStore(this.store.vault)
    }

    async save (): Promise<void> {
        // Scrub undefined values
        let cleanStore = JSON.parse(JSON.stringify(this._store))
        cleanStore = await this.maybeEncryptConfig(cleanStore)
        await this.platform.saveConfig(yaml.dump(cleanStore))
        this.emitChange()
        this.hostApp.broadcastConfigChange(JSON.parse(JSON.stringify(this.store)))
    }

    /**
     * Reads config YAML as string
     */
    readRaw (): string {
        return yaml.dump(this._store)
    }

    /**
     * Writes config YAML as string
     */
    async writeRaw (data: string): Promise<void> {
        this._store = yaml.load(data)
        await this.save()
        await this.load()
        this.emitChange()
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
    enabledServices<T extends object> (services: T[]): T[] { // eslint-disable-line @typescript-eslint/ban-types
        if (!this.servicesCache) {
            this.servicesCache = {}
            const ngModule = window['rootModule'].ɵinj
            for (const imp of ngModule.imports) {
                const module = imp.ngModule || imp
                if (module.ɵinj?.providers) {
                    this.servicesCache[module.pluginName] = module.ɵinj.providers.map(provider => {
                        return provider.useClass ?? provider.useExisting ?? provider
                    })
                }
            }
        }
        return services.filter(service => {
            for (const pluginName in this.servicesCache) {
                if (this.servicesCache[pluginName].includes(service.constructor)) {
                    return !this.store?.pluginBlacklist?.includes(pluginName)
                }
            }
            return true
        })
    }

    private async init () {
        await this.load()
        this.ready.next(true)
        this.ready.complete()

        this.hostApp.configChangeBroadcast$.subscribe(async () => {
            await this.load()
            this.emitChange()
        })
    }

    private emitChange (): void {
        this.changed.next()
        this.vault.setStore(this.store.vault)
    }

    private migrate (config) {
        config.version ??= 0
        if (config.version < 1) {
            for (const connection of config.ssh?.connections ?? []) {
                if (connection.privateKey) {
                    connection.privateKeys = [connection.privateKey]
                    delete connection.privateKey
                }
            }
            config.version = 1
        }
        if (config.version < 2) {
            config.profiles ??= []
            if (config.terminal?.recoverTabs !== undefined) {
                config.recoverTabs = config.terminal.recoverTabs
                delete config.terminal.recoverTabs
            }
            for (const profile of config.terminal?.profiles ?? []) {
                if (profile.sessionOptions) {
                    profile.options = profile.sessionOptions
                    delete profile.sessionOptions
                }
                profile.type = 'local'
                profile.id = `local:custom:${uuidv4()}`
            }
            if (config.terminal?.profiles) {
                config.profiles = config.terminal.profiles
                delete config.terminal.profiles
                delete config.terminal.environment
                config.terminal.profile = `local:${config.terminal.profile}`
            }
            config.version = 2
        }
        if (config.version < 3) {
            delete config.ssh?.recentConnections
            for (const c of config.ssh?.connections ?? []) {
                const p = {
                    id: `ssh:${uuidv4()}`,
                    type: 'ssh',
                    icon: 'fas fa-desktop',
                    name: c.name,
                    group: c.group ?? undefined,
                    color: c.color,
                    disableDynamicTitle: c.disableDynamicTitle,
                    options: c,
                }
                config.profiles.push(p)
            }
            for (const p of config.profiles ?? []) {
                if (p.type === 'ssh') {
                    if (p.options.jumpHost) {
                        p.options.jumpHost = config.profiles.find(x => x.name === p.options.jumpHost)?.id
                    }
                }
            }
            for (const c of config.serial?.connections ?? []) {
                const p = {
                    id: `serial:${uuidv4()}`,
                    type: 'serial',
                    icon: 'fas fa-microchip',
                    name: c.name,
                    group: c.group ?? undefined,
                    color: c.color,
                    options: c,
                }
                config.profiles.push(p)
            }
            delete config.ssh?.connections
            delete config.serial?.connections
            delete window.localStorage.lastSerialConnection
            config.version = 3
        }
    }

    private async maybeDecryptConfig (store) {
        if (!store.encrypted) {
            return store
        }
        // eslint-disable-next-line @typescript-eslint/init-declarations
        let decryptedVault: Vault
        while (true) {
            try {
                const passphrase = await this.vault.getPassphrase()
                decryptedVault = await this.vault.decrypt(store.vault, passphrase)
                break
            } catch (e) {
                let result = await this.platform.showMessageBox({
                    type: 'error',
                    message: 'Could not decrypt config',
                    detail: e.toString(),
                    buttons: ['Try again', 'Erase config', 'Quit'],
                    defaultId: 0,
                })
                if (result.response === 2) {
                    this.platform.quit()
                }
                if (result.response === 1) {
                    result = await this.platform.showMessageBox({
                        type: 'warning',
                        message: 'Are you sure?',
                        detail: e.toString(),
                        buttons: ['Erase config', 'Quit'],
                        defaultId: 1,
                    })
                    if (result.response === 1) {
                        this.platform.quit()
                    }
                    return {}
                }
            }
        }
        delete decryptedVault.config.vault
        delete decryptedVault.config.encrypted
        delete decryptedVault.config.configSync
        return {
            ...decryptedVault.config,
            vault: store.vault,
            encrypted: store.encrypted,
            configSync: store.configSync,
        }
    }

    private async maybeEncryptConfig (store) {
        if (!store.encrypted) {
            return store
        }
        const vault = await this.vault.load()
        if (!vault) {
            throw new Error('Vault not configured')
        }
        vault.config = { ...store }
        delete vault.config.vault
        delete vault.config.encrypted
        delete vault.config.configSync
        return {
            vault: await this.vault.encrypt(vault),
            encrypted: true,
            configSync: store.configSync,
        }
    }
}
