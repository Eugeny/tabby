import * as isDev from 'electron-is-dev'

import './global.scss'
import './toastr.scss'

import { enableProdMode, NgModuleRef } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

import { setupRootModule, RootModule } from './app.module'
import { findPlugins, loadPlugins, PluginInfo } from './plugins'

// Always land on the start view
location.hash = ''

;(process as any).enablePromiseAPI = true

if (process.platform === 'win32' && !('HOME' in process.env)) {
    process.env.HOME = `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`
}

if (isDev) {
    console.warn('Running in debug mode')
} else {
    enableProdMode()
}

async function bootstrap (plugins: PluginInfo[], safeMode = false): Promise<NgModuleRef<any>> {
    if (safeMode) {
        plugins = plugins.filter(x => x.isBuiltin)
    }
    const pluginModules = await loadPlugins(plugins, (current, total) => {
        (document.querySelector('.progress .bar') as HTMLElement).style.width = `${100 * current / total}%` // eslint-disable-line
    })
    setupRootModule(pluginModules)
    window['rootModule'] = RootModule
    return platformBrowserDynamic([
        { provide: 'plugins', useValue: pluginModules },
    ]).bootstrapModule(RootModule)
}

findPlugins().then(async plugins => {
    console.log('Starting with plugins:', plugins)
    try {
        await bootstrap(plugins)
    } catch (error) {
        console.error('Angular bootstrapping error:', error)
        console.warn('Trying safe mode')
        window['safeModeReason'] = error
        try {
            await bootstrap(plugins, true)
        } catch (error) {
            console.error('Bootstrap failed:', error)
        }
    }
})
