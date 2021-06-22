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

const mocks = {
    fs: {
        realpathSync: () => null,
        readdir: () => null,
        stat: () => null,
        appendFile: () => null,
        constants: {},
    },
    buffer: {
        Buffer: window['Buffer'],
    },
    crypto: {
        ...require('crypto-browserify'),
        getHashes () {
            return ['sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'md5', 'rmd160']
        },
        timingSafeEqual (a, b) {
            return a.equals(b)
        },
    },
    events: require('events'),
    path: require('path-browserify'),
    readline: {
        cursorTo: () => null,
        clearLine: stream => stream.write('\r'),
    },
    zlib: {
        ...require('browserify-zlib'),
        constants: require('browserify-zlib'),
    },
    'any-promise': Promise,
    tls: { },
    module: {
        globalPaths: [],
    },
    assert: require('assert'),
    url: {
        parse: () => null,
    },
    net: {
        Socket: SocketProxy,
    },
    http: {
        Agent: class {},
        request: {},
    },
    https: {
        Agent: class {},
        request: {},
    },
    querystring: {},
    tty: { isatty: () => false },
    child_process: {},
    'readable-stream': {},
    os: {
        platform: () => 'web',
        homedir: () => '/home',
    },
    constants: require('constants-browserify'),
    'hterm-umdjs': {
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
    },
    dns: {},
    socksv5: {},
    util: require('util/'),
    keytar: {
        getPassword: () => null,
    },
    './crypto/build/Release/sshcrypto.node': {},
    '../build/Release/cpufeatures.node': {},
}

const builtins = {
    '@angular/core': angularCoreModule,
    '@angular/compiler': angularCompilerModule,
    '@angular/common': angularCommonModule,
    '@angular/forms': angularFormsModule,
    '@angular/platform-browser': angularPlatformBrowserModule,
    '@angular/platform-browser/animations': angularPlatformBrowserAnimationsModule,
    '@angular/platform-browser-dynamic': angularPlatformBrowserDynamicModule,
    '@angular/animations': angularAnimationsModule,
    '@ng-bootstrap/ng-bootstrap': ngBootstrapModule,
    'ngx-toastr': ngxToastrModule,
    deepmerge: require('deepmerge'),
    rxjs: require('rxjs'),
    'rxjs/operators': require('rxjs/operators'),
    'js-yaml': require('js-yaml'),
    'zone.js/dist/zone.js': require('zone.js/dist/zone.js'),
}

const originalRequire = window['require']
const mockRequire = path => {
    if (mocks[path]) {
        console.log(':: mock', path)
        return mocks[path]
    }
    if (builtins[path]) {
        return builtins[path]
    }
    return originalRequire(path)
}

mockRequire['resolve'] = (() => null) as any

Object.assign(window, {
    require: mockRequire,
    module: {
        paths: [],
    },
    __dirname: '__dirname',
    setImmediate: setTimeout as any,
})

window['require'].main = {
    paths: [],
} as any

mocks.module['prototype'] = { require: window['require'] }
mocks.assert.assertNotStrictEqual = () => true
mocks.assert.notStrictEqual = () => true

// Late mocks and builtins

builtins['ssh2'] = require('ssh2')
builtins['ssh2/lib/protocol/constants'] = require('ssh2/lib/protocol/constants')
builtins['stream'] = require('stream-browserify')
