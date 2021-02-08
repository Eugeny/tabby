import 'core-js/proposals/reflect-metadata'

import '@fortawesome/fontawesome-free/css/solid.css'
import '@fortawesome/fontawesome-free/css/brands.css'
import '@fortawesome/fontawesome-free/css/fontawesome.css'
import 'source-code-pro/source-code-pro.css'
import 'source-sans-pro/source-sans-pro.css'

async function start () {
    class NodePTY {
        _writable = true
        handlers = {
            exit: [],
            close: [],
            data: [],
            'data-buffered': [],
        }
        static vm: any
        loggedIn = false

        constructor () {
            if (!NodePTY.vm) {
                NodePTY.vm = new window['V86Starter']({
                    bios: {
                        url: '../data/bios.bin',
                    },
                    vga_bios: {
                        url: '../data/vgabios.bin',
                    },
                    wasm_path: '../data/v86.wasm',
                    cdrom: {
                        url: '../data/linux.iso',
                    },
                    initial_state: {
                        url: '../data/v86state.bin'
                    },
                    autostart: true,
                    disable_keyboard: true,
                })
                NodePTY.vm.add_listener('emulator-ready', () => {
                    this.emit('data', '\r\nVM ready, booting\r\n')
                    setTimeout(() => {
                        this.emit('data', '[Yes, this is a real demo]\r\n')
                    }, 2000)
                })
                NodePTY.vm.add_listener('download-progress', (e) => {
                    this.emit('data', `\rDownloading ${e.file_name}: ${e.loaded / 1024}/${e.total / 1024} kB         `)
                })
                NodePTY.vm.add_listener('download-error', (e) => {
                    this.emit('data', '\r\nDownload error\r\n')
                })
            } else {
                setTimeout(() => {
                    this.write('\n')
                }, 2000)
            }

            NodePTY.vm.add_listener('serial0-output-char', char => {
                this.emit('data', char)
            })
        }

        resize () { }

        write (data) {
            //data = data.replace('\r', '\n')
            NodePTY.vm.serial0_send(data.toString())
            //this.emit('data', data)
        }

        on (event, handler) {
            this.handlers[event].push(handler)
        }

        emit (event, arg) {
            for (let x of this.handlers[event]) {
                x(arg)
            }
        }

        kill () {
        }
    }

    class Logger {
        constructor () {
            for (let x of ['info', 'warn', 'error', 'log', 'debug']) {
                this[x] = () => null
            }
        }
    }

    function MockStream () {
        this.once = () => null
        this._readableState = {}
        return this
    }

    const mocks = {
        fs: {
            realpathSync: path => {
                console.warn('mock realPathSync', path)
                return path
            },
            existsSync: path => {
                if (path === 'app-path/config.yaml') {
                    return true
                }
                console.warn('mock existsSync', path)
                return false
            },
            mkdir: path => {
                console.warn('mock mkdir', path)
            },
            mkdirSync: path => {
                console.warn('mock mkdirSync', path)
            },
            stat: (path, cb) => {
                if ([
                    'resources/builtin-plugins',
                    'resources/builtin-plugins/terminus-core/package.json',
                    'resources/builtin-plugins/terminus-settings/package.json',
                    'resources/builtin-plugins/terminus-terminal/package.json',
                ].includes(path)) {
                    cb(null, {})
                } else {
                    console.warn('mock stat', path)
                    cb('ENOEXIST')
                }
            },
            writeFileSync: () => null,
            readFileSync: (path) => {
                if (path === 'app-path/config.yaml') {
                    return `
                        enableAnalytics: false
                        enableWelcomeTab: false
                        terminal:
                            font: "Source Code Pro"
                            autoOpen: true
                        appearance:
                            vibrancy: false
                    `
                }
                return ''
            },
            readFile: (path, enc, cb) => {
                if (path === 'resources/builtin-plugins/terminus-core/package.json') {
                    cb(null, '{ "keywords": ["terminus-builtin-plugin"], "author": "" }')
                } else if (path === 'resources/builtin-plugins/terminus-settings/package.json') {
                    cb(null, '{ "keywords": ["terminus-builtin-plugin"], "author": "" }')
                } else if (path === 'resources/builtin-plugins/terminus-terminal/package.json') {
                    cb(null, '{ "keywords": ["terminus-builtin-plugin"], "author": "" }')
                } else if (path === '/etc/shells') {
                    cb(null, '/bin/sh')
                } else if (path === '/etc/passwd') {
                    cb(null, 'root:x:0:0:root:/root:/bin/zsh\n')
                } else {
                    console.warn('mock readFile', path)
                    cb('UNKNOWN', null)
                }
            },
            readdir: (path, cb) => {
                if (path === 'resources/builtin-plugins') {
                    cb(null, [
                        'terminus-core',
                        'terminus-settings',
                        'terminus-terminal',
                    ])
                } else {
                    console.warn('mock readdir', path)
                    cb(null, [])
                }
            },
        },
        electron: {
            remote: {
                app: {
                    getVersion: () => '1.0-web',
                    getPath: () => 'app-path',
                    getWindow: () => ({
                        reload: () => null,
                    }),
                },
                screen: {
                    on: () => null,
                    getAllDisplays: () => [],
                    getPrimaryDisplay: () => ({}),
                    getCursorScreenPoint: () => ({}),
                    getDisplayNearestPoint: () => null,
                },
                globalShortcut: {
                    unregisterAll: () => null,
                    register: () => null,
                },
                autoUpdater: {
                    on: () => null,
                    once: () => null,
                    setFeedURL: () => null,
                    checkForUpdates: () => null,
                },
                BrowserWindow: {
                    fromId: () => ({
                        setOpacity: () => null,
                        setProgressBar: () => null,
                    }),
                },
            },
            ipcRenderer: {
                on: () => null,
                send: msg => console.log('[ipc]', msg)
            },
        },
        path: {
            join: (...x) => x.join('/'),
            basename: x => x,
            dirname: x => x,
            relative: (a, b) => b,
            resolve: (a, b) => {
                console.warn('mock path.resolve', a, b)
                return b
            }
        },
        buffer: {
            Buffer: require('buffer').Buffer,
        },
        crypto: {
        },
        stream: {
            Stream: MockStream,
            Writable: Object,
        },
        util: {
            inherits: (a, b) => null,
            promisify: () => null,
        },
        net: {
        },
        module: {
            globalPaths: [],
        },
        assert: () => true,
        url: {
            parse: () => null,
        },
        http: {
            Agent: { prototype: {} },
            request: {},
        },
        https: {
            Agent: { prototype: {} },
            request: {},
        },
        querystring: {},
        events: {},
        tty: { isatty: () => false },
        child_process: {},
        winston: {
            Logger,
            transports: {
                File: Object,
                Console: Object,
            }
        },
        'readable-stream': {},
        os: {
            platform: () => 'linux',
            homedir: () => '/home',
        },
        'mz/child_process': {
            exec: (...x) => Promise.reject(),
        },
        'mz/fs': {
            readFile: path => mocks.fs.readFileSync(path),
            exists: path => mocks.fs.existsSync(path),
            existsSync: path => mocks.fs.existsSync(path),
        },
        '@terminus-term/node-pty': {
            spawn: () => {
                return new NodePTY()
            }
        },
        constants: {},
    }

    ;(mocks.assert as any).assertNotStrictEqual = () => true
    ;(mocks.assert as any).notStrictEqual = () => true

    let builtins = {
        '@angular/core': require('@angular/core'),
        '@angular/compiler': require('@angular/compiler'),
        '@angular/common': require('@angular/common'),
        '@angular/forms': require('@angular/forms'),
        '@angular/platform-browser': require('@angular/platform-browser'),
        '@angular/platform-browser/animations': require('@angular/platform-browser/animations'),
        '@angular/platform-browser-dynamic': require('@angular/platform-browser-dynamic'),
        '@angular/animations': require('@angular/animations'),
        '@ng-bootstrap/ng-bootstrap': require('@ng-bootstrap/ng-bootstrap'),
        'ngx-toastr': require('ngx-toastr'),
        'deepmerge': require('deepmerge'),
        'rxjs': require('rxjs'),
        'rxjs/operators': require('rxjs/operators'),
        'js-yaml': require('js-yaml'),
        'zone.js/dist/zone.js': require('zone.js/dist/zone.js'),
        'rxjs/internal/observable/fromEvent': require('rxjs/internal/observable/fromEvent'),
        'rxjs/internal/observable/merge': require('rxjs/internal/observable/merge'),
    }

    Object.assign(window, {
        require: (path) => {
            if (mocks[path]) {
                return mocks[path]
            }
            if (builtins[path]) {
                return builtins[path]
            }
            console.warn('requiring', path)
        },
        process: {
            env: { XWEB: 1, LOGNAME: 'root' },
            argv: ['terminus'],
            platform: 'linux',
            on: () => null,
            stdout: {},
            stderr: {},
            resourcesPath: 'resources',
            version: '14.0.0',
            cwd: () => '/',
        },
        global: window,
    })

    window['require'].main = {
        paths: []
    }

    window['module'] = {
        paths: []
    }

    window['require'].resolve = path => null
    window['Buffer'] = mocks.buffer.Buffer
    window['__dirname'] = '__dirname'
    window['setImmediate'] = setTimeout
    mocks.module['prototype'] = { require: window['require'] }
    mocks.electron.remote['process'] = window['process']

    let pluginCode = {
        core: await import(/* webpackChunkName: "app" */ '../terminus/terminus-core/dist/index.js'),
        settings: await import(/* webpackChunkName: "app" */ '../terminus/terminus-settings/dist/index.js'),
        terminal: await import(/* webpackChunkName: "app" */ '../terminus/terminus-terminal/dist/index.js'),
    }

    function loadPlugin (name) {
        let code = `(function (exports, require, module) { \n${pluginCode[name].default}\n })`
        let m = eval(code)
        let module = { exports: {} }
        m(module.exports, window['require'], module)
        return module.exports
    }


    builtins['resources/builtin-plugins/terminus-core'] = builtins['terminus-core'] = loadPlugin('core')
    builtins['resources/builtin-plugins/terminus-settings'] = builtins['terminus-settings'] = loadPlugin('settings')
    builtins['resources/builtin-plugins/terminus-terminal'] = builtins['terminus-terminal'] = loadPlugin('terminal')

    require('script-loader!./data/v86_all.js')
    await import(/* webpackChunkName: "app" */ '../terminus/app/dist/preload.js')
    document.querySelector('app-root')['style'].display = 'flex'
    await import(/* webpackChunkName: "app" */ '../terminus/app/dist/bundle.js')
}

start()
