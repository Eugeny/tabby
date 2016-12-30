import { Injectable } from '@angular/core'
const Config = nodeRequire('electron-config')


@Injectable()
export class ConfigService {
    constructor() {
        this.config = new Config({name: 'config'})
        this.load()
    }

    private config: any
    private store: any

    set(key: string, value: any) {
        this.store.set(key, value)
        this.save()
    }

    get(key: string): any {
        return this.store[key]
    }

    has(key: string): boolean {
        return this.store[key] != undefined
    }

    delete(key: string) {
        delete this.store[key]
        this.save()
    }

    load() {
        this.store = this.config.store
    }

    save() {
        this.config.store = this.store
    }
}
