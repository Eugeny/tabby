console.timeStamp('entry point')

import 'core-js'
import 'zone.js/dist/zone.js'
import 'core-js/es7/reflect'
import 'jquery'

// Always land on the start view
location.hash = ''

import { AppModule } from 'app.module'
import { enableProdMode } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

if (nodeRequire('electron-is-dev')) {
    console.warn('Running in debug mode')
} else {
    enableProdMode()
}

console.timeStamp('angular bootstrap started')
platformBrowserDynamic().bootstrapModule(AppModule)


process.emitWarning = function () { console.log(arguments) }
