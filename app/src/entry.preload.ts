import '../lib/lru'
import 'core-js/proposals/reflect-metadata'
import 'source-sans-pro/source-sans-pro.css'
import 'source-code-pro/source-code-pro.css'
import '@fortawesome/fontawesome-free/css/solid.css'
import '@fortawesome/fontawesome-free/css/brands.css'
import '@fortawesome/fontawesome-free/css/fontawesome.css'
import 'ngx-toastr/toastr.css'
import './preload.scss'
import * as path from 'path'

const nodeModule = require('module') // eslint-disable-line @typescript-eslint/no-var-requires
const nodeRequire = (global as any).require


const builtinModules = [
    '@angular/animations',
    '@angular/common',
    '@angular/compiler',
    '@angular/core',
    '@angular/forms',
    '@angular/localize',
    '@angular/platform-browser',
    '@angular/platform-browser-dynamic',
    '@ng-bootstrap/ng-bootstrap',
    'ngx-toastr',
    'rxjs',
    'rxjs/operators',
    'rxjs/internal/observable/fromEvent',
    'rxjs/internal/observable/merge',
    'rxjs-compat/Subject',
    'zone.js/dist/zone.js',
    'terminus-core',
    // 'terminus-settings',
    // 'terminus-terminal',
]

const cachedBuiltinModules = {}

if (process.env.TERMINUS_DEV) {
    console.info(path.dirname(require('electron').remote.app.getAppPath()))
    nodeModule.globalPaths.unshift(path.dirname(require('electron').remote.app.getAppPath()))
    nodeModule.globalPaths.unshift(path.join(require('electron').remote.app.getAppPath(), 'node_modules'))
}

const originalRequire = (global as any).require
;(global as any).require = function (query: string) {
    if (cachedBuiltinModules[query]) {
        return cachedBuiltinModules[query]
    }
    return originalRequire.apply(this, arguments)
}

const originalModuleRequire = nodeModule.prototype.require
nodeModule.prototype.require = function (query: string) {
    if (cachedBuiltinModules[query]) {
        return cachedBuiltinModules[query]
    }
    return originalModuleRequire.call(this, query)
}

global['require'].resolve = originalRequire.resolve
nodeModule.prototype.require.resolve = originalModuleRequire.resolve

builtinModules.forEach(m => {
    const label = 'Caching ' + m
    console.time(label)
    try {
        console.log(m + '/__ivy_ngcc__/fesm5/' + m.split('/')[1] + '.js')
        cachedBuiltinModules[m] = nodeRequire(m + '/__ivy_ngcc__/fesm5/' + m.split('/')[1] + '.js')
        console.log('loaded ivy')
    } catch (e) {
        console.error(e)
        cachedBuiltinModules[m] = nodeRequire(m)
    }
    console.timeEnd(label)
})
