import { Injectable } from '@angular/core'
import { HostAppService, PLATFORM_MAC, PLATFORM_WINDOWS } from 'services/hostApp'
const Config = nodeRequire('electron-config')
const exec = nodeRequire('child-process-promise').exec
import * as fs from 'fs'


@Injectable()
export class ConfigService {
    constructor(
        private hostApp: HostAppService,
    ) {
        this.config = new Config({name: 'config'})
        this.load()
    }

    private config: any
    private store: any

    migrate() {
        if (!this.has('migrated')) {
            if (this.hostApp.platform == PLATFORM_WINDOWS) {
                let configPath = `${this.hostApp.getPath('documents')}\\.elements.conf`
                let config = null
                try {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
                    console.log('Migrating configuration:', config)
                    this.set('host', config.Hostname)
                    this.set('username', config.Username)
                    this.set('firstDrive', config.FirstDrive)
                } catch (err) {
                    console.error('Could not migrate the config:', err)
                }
                this.set('migrated', 1)
                this.save()
                return Promise.resolve()
            }
            if (this.hostApp.platform == PLATFORM_MAC) {
                return Promise.all([
                    exec('defaults read ~/Library/Preferences/com.syslink.Elements.plist connection_host').then((result) => {
                        this.set('host', result.stdout.trim())
                    }),
                    exec('defaults read ~/Library/Preferences/com.syslink.Elements.plist connection_username').then((result) => {
                        this.set('username', result.stdout.trim())
                    }),
                ]).then(() => {
                    this.set('migrated', 1)
                    this.save()
                }).catch((err) => {
                    console.error('Could not migrate the config:', err)
                    this.set('migrated', 1)
                    this.save()
                })
            }
        }
        return Promise.resolve()
    }

    set(key: string, value: any) {
        this.save()
        this.config.set(key, value)
        this.load()
    }

    get(key: string): any {
        this.save()
        return this.config.get(key)
    }

    has(key: string): boolean {
        this.save()
        return this.config.has(key)
    }

    delete(key: string) {
        this.save()
        this.config.delete(key)
        this.load()
    }

    load() {
        this.store = this.config.store
    }

    save() {
        this.config.store = this.store
    }
}
