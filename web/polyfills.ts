/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-extraneous-class */
import * as angularCoreModule from '@angular/core'
import * as angularCompilerModule from '@angular/compiler'
import * as angularCommonModule from '@angular/common'
import * as angularFormsModule from '@angular/forms'
import * as angularPlatformBrowserModule from '@angular/platform-browser'
import * as angularPlatformBrowserAnimationsModule from '@angular/platform-browser/animations'
import * as angularPlatformBrowserDynamicModule from '@angular/platform-browser-dynamic'
import * as angularAnimationsModule from '@angular/animations'
import * as ngBootstrapModule from '@ng-bootstrap/ng-bootstrap'
import * as ngxToastrModule from 'ngx-toastr'

import './polyfills.buffer'
import { Duplex } from 'stream-browserify'

const Tabby = window['Tabby']

export class SocketProxy extends Duplex {
    socket: any

    constructor (...args: any[]) {
        super({
            allowHalfOpen: false,
        })
        this.socket = window['__connector__'].createSocket(...args)
        this.socket.connect$.subscribe(() => this['emit']('connect'))
        this.socket.data$.subscribe(data => this['emit']('data', Buffer.from(data)))
        this.socket.error$.subscribe(error => this['emit']('error', error))
    }

    connect (...args: any[]) {
        this.socket.connect(...args)
    }

    setNoDelay () { }

    setTimeout () { }

    _read (_size: number): void { }

    _write (chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void): void {
        this.socket.write(chunk)
        callback()
    }

    _destroy (error: Error|null, callback: (error: Error|null) => void): void {
        this.socket.close(error)
        callback(error)
    }
}

Tabby.registerMock('fs', {
    realpathSync: () => null,
    readdir: () => null,
    stat: () => null,
    appendFile: () => null,
    constants: {},
})
Tabby.registerMock('any-promise', Promise)
Tabby.registerMock('tls', {})
Tabby.registerMock('module', {
    globalPaths: [],
    prototype: { require: window['require'] },
})

Tabby.registerMock('url', {
    parse: () => null,
})
Tabby.registerMock('http', {
    Agent: class {},
    request: {},
})
Tabby.registerMock('https', {
    Agent: class {},
    request: {},
})
Tabby.registerMock('querystring', {})
Tabby.registerMock('tty', { isatty: () => false })
Tabby.registerMock('child_process', {})
Tabby.registerMock('readable-stream', {})
Tabby.registerMock('os', {
    platform: () => 'web',
    homedir: () => '/home',
})
Tabby.registerModule('buffer', {
    Buffer: window['Buffer'],
})
Tabby.registerModule('crypto', {
    ...require('crypto-browserify'),
    getHashes () {
        return ['sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'md5', 'rmd160']
    },
    timingSafeEqual (a, b) {
        return a.equals(b)
    },
})
Tabby.registerMock('hterm-umdjs', {
    hterm: {
        PreferenceManager: class { set () {} },
        VT: {
            ESC: {},
            CSI: {},
            OSC: {},
        },
        Terminal: class {},
        Keyboard: class {},
    },
    lib: {
        wc: {},
        Storage: {
            Memory: class {},
        },
    },
})
Tabby.registerMock('dns', {})
Tabby.registerMock('socksv5', {})
Tabby.registerMock('util', require('util/'))
Tabby.registerMock('keytar', {
    getPassword: () => null,
})
Tabby.registerMock('@serialport/bindings', {})

Tabby.registerModule('net', {
    Socket: SocketProxy,
})
Tabby.registerModule('events', require('events'))
Tabby.registerModule('path', require('path-browserify'))
Tabby.registerModule('zlib', {
    ...require('browserify-zlib'),
    constants: require('browserify-zlib'),
})
Tabby.registerModule('assert', Object.assign(
    require('assert'),
    {
        assertNotStrictEqual: () => true,
        notStrictEqual: () => true,
    },
))
Tabby.registerModule('constants', require('constants-browserify'))
Tabby.registerModule('stream', require('stream-browserify'))
Tabby.registerModule('readline', {
    ...require('readline-browserify'),
    cursorTo: () => null,
    clearLine: stream => stream.write('\r'),
})

Tabby.registerModule('@angular/core', angularCoreModule)
Tabby.registerModule('@angular/compiler', angularCompilerModule)
Tabby.registerModule('@angular/common', angularCommonModule)
Tabby.registerModule('@angular/forms', angularFormsModule)
Tabby.registerModule('@angular/platform-browser', angularPlatformBrowserModule)
Tabby.registerModule('@angular/platform-browser/animations', angularPlatformBrowserAnimationsModule)
Tabby.registerModule('@angular/platform-browser-dynamic', angularPlatformBrowserDynamicModule)
Tabby.registerModule('@angular/animations', angularAnimationsModule)
Tabby.registerModule('@ng-bootstrap/ng-bootstrap', ngBootstrapModule)
Tabby.registerModule('ngx-toastr', ngxToastrModule)
Tabby.registerModule('deepmerge', require('deepmerge'))
Tabby.registerModule('rxjs', require('rxjs'))
Tabby.registerModule('rxjs/operators', require('rxjs'))
Tabby.registerModule('js-yaml', require('js-yaml'))
Tabby.registerModule('zone.js/dist/zone.js', require('zone.js/dist/zone.js'))

Object.assign(window, {
    __dirname: '__dirname',
    setImmediate: setTimeout as any,
})
