(<any>console).timeStamp('entry point')

import 'core-js'
import 'zone.js/dist/zone.js'
import 'core-js/es7/reflect'
import 'rxjs'

// Always land on the start view
location.hash = ''

import { getRootModule } from './app.module'
import { enableProdMode } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

if ((<any>global).require('electron-is-dev')) {
    console.warn('Running in debug mode')
} else {
    enableProdMode()
}

getRootModule().then(module => {
    platformBrowserDynamic().bootstrapModule(module)
})
