import * as yaml from 'js-yaml'
import axios from 'axios'
import { Injectable } from '@angular/core'
import { ConfigService, HostAppService, Logger, LogService, Platform, PlatformService } from 'tabby-core'

export interface User {
    id: number
}

export interface Config {
    id: number
    name: string
    content: string
    last_used_with_version: string|null
    created_at: Date
    modified_at: Date
}

const OPTIONAL_CONFIG_PARTS = ['hotkeys', 'appearance', 'vault']

@Injectable({ providedIn: 'root' })
export class ConfigSyncService {
    private logger: Logger
    private lastRemoteChange = new Date(0)

    constructor (
        log: LogService,
        private platform: PlatformService,
        private hostApp: HostAppService,
        private config: ConfigService,
    ) {
        this.logger = log.create('configSync')
        config.ready$.toPromise().then(() => {
            this.autoSync()
            config.changed$.subscribe(() => {
                if (this.isEnabled() && this.config.store.configSync.auto) {
                    this.upload()
                }
            })
        })
    }

    isAvailable (): boolean {
        return this.hostApp.platform !== Platform.Web
    }

    isEnabled (): boolean {
        return this.isAvailable() &&
            !!this.config.store.configSync.host &&
            !!this.config.store.configSync.token &&
            !!this.config.store.configSync.configID
    }

    async getConfigs (): Promise<Config[]> {
        return this.request('GET', '/api/1/configs')
    }

    async getConfig (id: number): Promise<Config> {
        return this.request('GET', `/api/1/configs/${id}`)
    }

    async updateConfig (id: number, data: Partial<Config>): Promise<Config> {
        return this.request('PATCH', `/api/1/configs/${id}`, { data })
    }

    async getUser (): Promise<any> {
        return this.request('GET', '/api/1/user')
    }

    async createNewConfig (name: string): Promise<Config> {
        return this.request('POST', '/api/1/configs', {
            data: {
                name,
            },
        })
    }

    async deleteConfig (id: number): Promise<any> {
        return this.request('DELETE', `/api/1/configs/${id}`)
    }

    setConfig (config: Config): void {
        this.config.store.configSync.configID = config.id
        this.config.save()
        this.lastRemoteChange = new Date(config.modified_at)
    }

    async upload (): Promise<void> {
        if (!this.isEnabled()) {
            return
        }
        try {
            const data = await this.readConfigDataForSync()
            const remoteData = yaml.load((await this.getConfig(this.config.store.configSync.configID)).content) as any
            for (const part of OPTIONAL_CONFIG_PARTS) {
                if (!this.config.store.configSync.parts[part]) {
                    data[part] = remoteData[part]
                }
            }
            const content = yaml.dump(data)
            const result = await this.updateConfig(this.config.store.configSync.configID, {
                content,
                last_used_with_version: this.platform.getAppVersion(),
            })
            this.lastRemoteChange = new Date(result.modified_at)
            this.logger.debug('Config uploaded')
        } catch (error) {
            this.logger.error('Upload failed:', error)
            throw error
        }
    }

    async download (): Promise<void> {
        if (!this.isEnabled()) {
            return
        }
        try {
            const config = await this.getConfig(this.config.store.configSync.configID)
            const data = yaml.load(config.content) as any

            const localData = yaml.load(this.config.readRaw()) as any
            data.configSync = localData.configSync

            if (!data.encrypted) {
                for (const part of OPTIONAL_CONFIG_PARTS) {
                    if (!this.config.store.configSync.parts[part]) {
                        data[part] = localData[part]
                    }
                }
            }

            await this.writeConfigDataFromSync(data)
            this.logger.debug('Config downloaded')
        } catch (error) {
            this.logger.error('Download failed:', error)
            throw error
        }
    }

    async delete (config: Config): Promise<void> {
        try {
            await this.deleteConfig(config.id)
            this.logger.debug('Config deleted')
        } catch (error) {
            this.logger.error('Delete failed:', error)
            throw error
        }
    }

    private async readConfigDataForSync (): Promise<any> {
        const data = yaml.load(await this.platform.loadConfig()) as any
        delete data.configSync
        return data
    }

    private async writeConfigDataFromSync (data: any) {
        await this.platform.saveConfig(yaml.dump(data))
        await this.config.load()
        await this.config.save()
    }

    private async request (method: 'GET'|'POST'|'PATCH'|'DELETE', url: string, params = {}) {
        if (this.config.store.configSync.host.endsWith('/')) {
            this.config.store.configSync.host = this.config.store.configSync.host.slice(0, -1)
        }
        url = this.config.store.configSync.host + url
        this.logger.debug(`${method} ${url}`, params)
        try {
            const response = await axios.request({
                url,
                method,
                headers: {
                    Authorization: `Bearer ${this.config.store.configSync.token}`,
                },
                ...params,
            })
            this.logger.debug(response)
            return response.data
        } catch (error) {
            this.logger.error(error)
            throw error
        }
    }

    private async autoSync () {
        while (true) {
            try {
                if (this.isEnabled() && this.config.store.configSync.auto) {
                    const cfg = await this.getConfig(this.config.store.configSync.configID)
                    if (new Date(cfg.modified_at) > this.lastRemoteChange) {
                        this.logger.info('Remote config changed, downloading')
                        this.download()
                        this.lastRemoteChange = new Date(cfg.modified_at)
                    }
                }
            } catch (error) {
                this.logger.debug('Recovering from autoSync network error')
            }
            await new Promise(resolve => setTimeout(resolve, 60000))
        }
    }
}
