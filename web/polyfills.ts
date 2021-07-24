/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-extraneous-class */

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

Tabby.registerModule('@angular/core', require('@angular/core'))
Tabby.registerModule('@angular/cdk', require('@angular/cdk'))
Tabby.registerModule('@angular/cdk/clipboard', require('@angular/cdk/clipboard'))
Tabby.registerModule('@angular/cdk/drag-drop', require('@angular/cdk/drag-drop'))
Tabby.registerModule('@angular/compiler', require('@angular/compiler'))
Tabby.registerModule('@angular/common', require('@angular/common'))
Tabby.registerModule('@angular/forms', require('@angular/forms'))
Tabby.registerModule('@angular/platform-browser', require('@angular/platform-browser'))
Tabby.registerModule('@angular/platform-browser/animations', require('@angular/platform-browser/animations'))
Tabby.registerModule('@angular/platform-browser-dynamic', require('@angular/platform-browser-dynamic'))
Tabby.registerModule('@angular/animations', require('@angular/animations'))
Tabby.registerModule('@ng-bootstrap/ng-bootstrap', require('@ng-bootstrap/ng-bootstrap'))
Tabby.registerModule('ngx-toastr', require('ngx-toastr'))
Tabby.registerModule('deepmerge', require('deepmerge'))
Tabby.registerModule('rxjs', require('rxjs'))
Tabby.registerModule('rxjs/operators', require('rxjs'))
Tabby.registerModule('js-yaml', require('js-yaml'))
Tabby.registerModule('zone.js/dist/zone.js', require('zone.js/dist/zone.js'))

Object.assign(window, {
    __dirname: '__dirname',
    setImmediate: setTimeout as any,
})
