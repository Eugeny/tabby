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

const Terminus = window['Terminus']

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

Terminus.registerMock('fs', {
    realpathSync: () => null,
    readdir: () => null,
    stat: () => null,
    appendFile: () => null,
    constants: {},
})
Terminus.registerMock('readline', {
    cursorTo: () => null,
    clearLine: stream => stream.write('\r'),
})
Terminus.registerMock('any-promise', Promise)
Terminus.registerMock('tls', {})
Terminus.registerMock('module', {
    globalPaths: [],
    prototype: { require: window['require'] },
})

Terminus.registerMock('url', {
    parse: () => null,
})
Terminus.registerMock('http', {
    Agent: class {},
    request: {},
})
Terminus.registerMock('https', {
    Agent: class {},
    request: {},
})
Terminus.registerMock('querystring', {})
Terminus.registerMock('tty', { isatty: () => false })
Terminus.registerMock('child_process', {})
Terminus.registerMock('readable-stream', {})
Terminus.registerMock('os', {
    platform: () => 'web',
    homedir: () => '/home',
})
Terminus.registerModule('buffer', {
    Buffer: window['Buffer'],
})
Terminus.registerModule('crypto', {
    ...require('crypto-browserify'),
    getHashes () {
        return ['sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'md5', 'rmd160']
    },
    timingSafeEqual (a, b) {
        return a.equals(b)
    },
})
Terminus.registerMock('hterm-umdjs', {
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
Terminus.registerMock('dns', {})
Terminus.registerMock('socksv5', {})
Terminus.registerMock('util', require('util/'))
Terminus.registerMock('keytar', {
    getPassword: () => null,
})

Terminus.registerModule('net', {
    Socket: SocketProxy,
})
Terminus.registerModule('events', require('events'))
Terminus.registerModule('path', require('path-browserify'))
Terminus.registerModule('zlib', {
    ...require('browserify-zlib'),
    constants: require('browserify-zlib'),
})
Terminus.registerModule('assert', Object.assign(
    require('assert'),
    {
        assertNotStrictEqual: () => true,
        notStrictEqual: () => true,
    },
))
Terminus.registerModule('constants', require('constants-browserify'))
Terminus.registerModule('stream', require('stream-browserify'))

Terminus.registerModule('@angular/core', angularCoreModule)
Terminus.registerModule('@angular/compiler', angularCompilerModule)
Terminus.registerModule('@angular/common', angularCommonModule)
Terminus.registerModule('@angular/forms', angularFormsModule)
Terminus.registerModule('@angular/platform-browser', angularPlatformBrowserModule)
Terminus.registerModule('@angular/platform-browser/animations', angularPlatformBrowserAnimationsModule)
Terminus.registerModule('@angular/platform-browser-dynamic', angularPlatformBrowserDynamicModule)
Terminus.registerModule('@angular/animations', angularAnimationsModule)
Terminus.registerModule('@ng-bootstrap/ng-bootstrap', ngBootstrapModule)
Terminus.registerModule('ngx-toastr', ngxToastrModule)
Terminus.registerModule('deepmerge', require('deepmerge'))
Terminus.registerModule('rxjs', require('rxjs'))
Terminus.registerModule('rxjs/operators', require('rxjs/operators'))
Terminus.registerModule('js-yaml', require('js-yaml'))
Terminus.registerModule('zone.js/dist/zone.js', require('zone.js/dist/zone.js'))

Object.assign(window, {
    __dirname: '__dirname',
    setImmediate: setTimeout as any,
})
