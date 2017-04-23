(<any>console).timeStamp('entry point')

import 'core-js'
import 'zone.js/dist/zone.js'
import 'core-js/es7/reflect'
import 'rxjs'

// Always land on the start view
location.hash = ''

import { enableProdMode } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

import { getRootModule } from './app.module'
import { loadPlugins } from './plugins'

if ((<any>global).require('electron-is-dev')) {
    console.warn('Running in debug mode')
} else {
    enableProdMode()
}

loadPlugins((current, total) => {
    (<HTMLElement>document.querySelector('.progress .bar')).style.width = 100 * current / total + '%'
}).then(async plugins => {
    let module = await getRootModule(plugins)
    platformBrowserDynamic().bootstrapModule(module)
})
