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
    console.log(`>> Loading ${url}`)
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

async function prefetchURL (url) {
    console.log(`:: Prefetching ${url}`)
    await (await fetch(url)).text()
}

const Tabby = {
    registerMock: (name, mod) => {
        mocks[name] = mod
    },
    registerModule: (name, mod) => {
        modules[name] = mod
    },
    resolvePluginInfo: async (url): Promise<any> => {
        const pkg = await (await fetch(url + '/package.json')).json()
        url += '/' + pkg.main
        return { ...pkg, url }
    },
    registerPluginModule: (packageName, module) => {
        Tabby.registerModule(`resources/builtin-plugins/${packageName}`, module)
        Tabby.registerModule(packageName, module)
    },
    loadPlugin: async (url) => {
        const info = await Tabby.resolvePluginInfo(url)
        const module = await webRequire(info.url)
        Tabby.registerPluginModule(info.name, module)
        return module
    },
    loadPlugins: async (urls, progressCallback) => {
        const infos: any[] = await Promise.all(urls.map(Tabby.resolvePluginInfo))
        progressCallback?.(0, 1)
        await Promise.all(infos.map(x => prefetchURL(x.url)))
        const pluginModules = []
        for (const info of infos) {
            const module = await webRequire(info.url)
            Tabby.registerPluginModule(info.name, module)
            pluginModules.push(module)
            progressCallback?.(infos.indexOf(info), infos.length)
        }
        progressCallback?.(1, 1)
        return pluginModules
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
        versions: {
            modules: 0,
        },
        nextTick: (f, ...args) => setTimeout(() => f(...args)),
        cwd: () => '/',
    },
    global: window,
})
