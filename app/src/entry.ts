import 'zone.js/dist/zone.js'
import 'core-js/es7/reflect'
import 'core-js/core/delay'
import 'rxjs'

// Always land on the start view
location.hash = ''

import { enableProdMode } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

import { getRootModule } from './app.module'
import { findPlugins, loadPlugins } from './plugins'

if (require('electron-is-dev')) {
    console.warn('Running in debug mode')
} else {
    enableProdMode()
}

findPlugins().then(async plugins => {
    let pluginsModules = await loadPlugins(plugins, (current, total) => {
        (document.querySelector('.progress .bar') as HTMLElement).style.width = 100 * current / total + '%'
    })
    let module = await getRootModule(pluginsModules)
    platformBrowserDynamic().bootstrapModule(module)
})
