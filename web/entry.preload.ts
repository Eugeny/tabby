import 'source-sans-pro/source-sans-pro.css'
import 'source-code-pro/source-code-pro.css'
import '@fortawesome/fontawesome-free/css/solid.css'
import '@fortawesome/fontawesome-free/css/brands.css'
import '@fortawesome/fontawesome-free/css/regular.css'
import '@fortawesome/fontawesome-free/css/fontawesome.css'
import 'ngx-toastr/toastr.css'
import '../app/src/preload.scss'

// Required before other imports
import './polyfills.buffer'

const mocks = {}
const modules = {}

const customRequire = path => {
    if (mocks[path]) {
        console.log(':: mock', path)
        return mocks[path]
    }
    if (modules[path]) {
        return modules[path]
    }
    throw new Error(`Attempted to require ${path}`)
}

customRequire['resolve'] = (() => null) as any
customRequire['main'] = {
    paths: [],
}

async function webRequire (url) {
    console.log(`Loading ${url}`)
    const e = document.createElement('script')
    window['module'] = { exports: {} } as any
    window['exports'] = window['module'].exports
    await new Promise(resolve => {
        e.onload = resolve
        e.src = url
        document.querySelector('head').appendChild(e)
    })
    return window['module'].exports
}

const Tabby = {
    registerMock: (name, mod) => {
        mocks[name] = mod
    },
    registerModule: (name, mod) => {
        modules[name] = mod
    },
    loadPlugin: async (url) => {
        const pkg = await (await fetch(url + '/package.json')).json()
        url += '/' + pkg.main
        const module = await webRequire(url)
        Tabby.registerModule(`resources/builtin-plugins/${pkg.name}`, module)
        Tabby.registerModule(pkg.name, module)
        return module
    },
    bootstrap: (...args) => window['bootstrapTabby'](...args),
    webRequire,
}

Object.assign(window, {
    require: customRequire,
    module: {
        paths: [],
    },
    Tabby,
    process: {
        env: { },
        argv: ['tabby'],
        platform: 'darwin',
        on: () => null,
        stdout: {},
        stderr: {},
        resourcesPath: 'resources',
        version: '14.0.0',
        nextTick: (f, ...args) => setTimeout(() => f(...args)),
        cwd: () => '/',
    },
    global: window,
})
