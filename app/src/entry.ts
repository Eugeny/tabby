(<any>console).timeStamp('entry point')

import 'core-js'
import 'zone.js/dist/zone.js'
import 'core-js/es7/reflect'
import 'jquery'

// Always land on the start view
location.hash = ''

import { RootModule } from 'app.module'
import { enableProdMode } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

if ((<any>global).require('electron-is-dev')) {
    console.warn('Running in debug mode')
} else {
    enableProdMode()
}

(<any>console).timeStamp('angular bootstrap started')
platformBrowserDynamic().bootstrapModule(RootModule);


(<any>process).emitWarning = function () { console.log(arguments) }
