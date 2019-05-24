import 'zone.js'
import 'core-js/proposals/reflect-metadata'
import 'rxjs'

import isDev = require('electron-is-dev')

import './global.scss'
import './toastr.scss'

// Always land on the start view
location.hash = ''

import { enableProdMode, NgModuleRef } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

import { getRootModule } from './app.module'
import { findPlugins, loadPlugins, IPluginInfo } from './plugins'

;(process as any).enablePromiseAPI = true

if (process.platform === 'win32') {
    process.env.HOME = process.env.HOMEDRIVE + process.env.HOMEPATH
}

if (isDev) {
    console.warn('Running in debug mode')
} else {
    enableProdMode()
}

async function bootstrap (plugins: IPluginInfo[], safeMode = false): Promise<NgModuleRef<any>> {
    if (safeMode) {
        plugins = plugins.filter(x => x.isBuiltin)
    }
    let pluginsModules = await loadPlugins(plugins, (current, total) => {
        (document.querySelector('.progress .bar') as HTMLElement).style.width = 100 * current / total + '%'
    })
    let module = getRootModule(pluginsModules)
    window['rootModule'] = module
    return platformBrowserDynamic().bootstrapModule(module)
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
