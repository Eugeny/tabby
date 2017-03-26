import { Injectable } from '@angular/core'


class Plugin {
    ngModule: any
    name: string
}


@Injectable()
export class PluginsService {
    plugins: Plugin[] = []

    register (plugin: Plugin): void {
        this.plugins.push(plugin)
    }

    getModules (): any[] {
        return this.plugins.map((plugin) => plugin.ngModule)
    }
}
