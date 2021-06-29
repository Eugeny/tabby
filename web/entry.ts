import './polyfills'

import 'zone.js'
import 'core-js/proposals/reflect-metadata'
import 'core-js/features/array/flat'
import 'rxjs'

import '../app/src/global.scss'
import '../app/src/toastr.scss'

import { enableProdMode, NgModuleRef, ApplicationRef } from '@angular/core'
import { enableDebugTools } from '@angular/platform-browser'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

import { getRootModule } from '../app/src/app.module'
import { BootstrapData, BOOTSTRAP_DATA } from '../tabby-core/src/api/mainProcess'

interface BootstrapOptions {
    packageModules: any[]
    bootstrapData: BootstrapData
    debugMode: boolean
    connector: any
}

window['bootstrapTabby'] = async function bootstrap (options: BootstrapOptions): Promise<NgModuleRef<any>> {
    window.parent.postMessage('request-connector', '*')

    const pluginModules = []
    for (const packageModule of options.packageModules) {
        const pluginModule = packageModule.default.forRoot ? packageModule.default.forRoot() : packageModule.default
        pluginModule.pluginName = packageModule.pluginName
        pluginModule.bootstrap = packageModule.bootstrap
        pluginModules.push(pluginModule)
    }

    if (!options.debugMode) {
        enableProdMode()
    }

    const module = getRootModule(pluginModules)
    window['rootModule'] = module

    const moduleRef = await platformBrowserDynamic([
        { provide: BOOTSTRAP_DATA, useValue: options.bootstrapData },
        { provide: 'WEB_CONNECTOR', useValue: options.connector },
    ]).bootstrapModule(module)
    if (options.debugMode) {
        const applicationRef = moduleRef.injector.get(ApplicationRef)
        const componentRef = applicationRef.components[0]
        enableDebugTools(componentRef)
    }
    return moduleRef
}
