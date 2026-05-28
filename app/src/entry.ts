import 'zone.js'
import 'core-js/proposals/reflect-metadata'
import 'rxjs'

import './global.scss'
import './toastr.scss'

// Importing before @angular/*
import { findPlugins, initModuleLookup, loadPlugins } from './plugins'

import { enableProdMode, NgModuleRef, ApplicationRef } from '@angular/core'
import { enableDebugTools } from '@angular/platform-browser'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'
import { ipcRenderer } from 'electron'

import { getRootModule } from './app.module'
import { BootstrapData, BOOTSTRAP_DATA, PluginInfo } from '../../tabby-core/src/api/mainProcess'

const SAFE_MODE_BUILTIN_PLUGINS = ['core', 'settings', 'terminal', 'local', 'electron']

// Always land on the start view
location.hash = ''

;(process as any).enablePromiseAPI = true

if (process.platform === 'win32' && !('HOME' in process.env)) {
    process.env.HOME = `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`
}

if (process.env.TABBY_DEV && !process.env.TABBY_FORCE_ANGULAR_PROD) {
    console.warn('Running in debug mode')
} else {
    enableProdMode()
}

async function bootstrap (bootstrapData: BootstrapData, plugins: PluginInfo[], safeMode = false): Promise<NgModuleRef<any>> {
    if (safeMode) {
        plugins = plugins.filter(x => x.isBuiltin && SAFE_MODE_BUILTIN_PLUGINS.includes(x.name))
    }

    const pluginModules = await loadPlugins(plugins, (current, total) => {
        (document.querySelector('.progress .bar') as HTMLElement).style.width = `${100 * current / total}%` // eslint-disable-line
    })

    window['pluginModules'] = pluginModules

    const module = getRootModule(pluginModules)
    const moduleRef = await platformBrowserDynamic([
        { provide: BOOTSTRAP_DATA, useValue: bootstrapData },
    ]).bootstrapModule(module)
    if (process.env.TABBY_DEV) {
        const applicationRef = moduleRef.injector.get(ApplicationRef)
        const componentRef = applicationRef.components[0]
        enableDebugTools(componentRef)
    }
    return moduleRef
}

function showErrorPage (error: any): void {
    const el = document.querySelector('.preload-logo div')
    if (!el) {
        return
    }

    const errorMessage = String(error?.message || error?.stack || error || 'Unknown error')
    el.textContent = ''

    const container = document.createElement('div')
    container.style.cssText = 'text-align: center; padding: 40px 20px; max-width: 560px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;'

    const title = document.createElement('h1')
    title.textContent = 'Startup Failed'
    title.style.cssText = 'color: #e06c75; font-size: 22px; font-weight: 600; margin-bottom: 16px;'

    const description = document.createElement('p')
    description.textContent = 'Tabby could not load one of its bundled plugins. This usually means the installation or portable package is incomplete, stale, or missing a native dependency.'
    description.style.cssText = 'color: #abb2bf; font-size: 14px; margin-bottom: 12px; line-height: 1.7;'

    const details = document.createElement('pre')
    details.textContent = errorMessage
    details.style.cssText = 'background: #1e222a; color: #e06c75; padding: 12px; border-radius: 6px; font-size: 12px; text-align: left; overflow-x: auto; margin: 16px 0; white-space: pre-wrap; word-break: break-all; max-height: 180px; font-family: "SF Mono", "Cascadia Code", monospace; border: 1px solid #3e4451;'

    const action = document.createElement('p')
    action.style.cssText = 'color: #abb2bf; font-size: 13px; line-height: 1.8;'
    action.innerHTML = '<strong style="color: #e5c07b;">To fix this:</strong><br>Reinstall Tabby from the latest release, or fully extract the portable package into an empty directory. Your settings will be preserved.<br><br>Press <kbd style="background: #3e4451; padding: 2px 7px; border-radius: 3px; border: 1px solid #5c6370; font-family: monospace;">Ctrl+Shift+I</kbd> to open DevTools for detailed logs.'

    container.append(title, description, details, action)
    el.append(container)
}

ipcRenderer.once('start', async (_$event, bootstrapData: BootstrapData) => {
    console.log('Window bootstrap data:', bootstrapData)

    initModuleLookup(bootstrapData.userPluginsPath)

    let plugins = await findPlugins()
    bootstrapData.installedPlugins = plugins
    if (bootstrapData.config.pluginBlacklist) {
        plugins = plugins.filter(x => !bootstrapData.config.pluginBlacklist.includes(x.name))
    }
    plugins = plugins.filter(x => x.name !== 'web')

    console.log('Starting with plugins:', plugins)
    try {
        await bootstrap(bootstrapData, plugins)
    } catch (error) {
        console.error('Angular bootstrapping error:', error)
        console.warn('Trying safe mode')
        window['safeModeReason'] = error
        try {
            await bootstrap(bootstrapData, plugins, true)
        } catch (error2) {
            console.error('Bootstrap failed:', error2)
            showErrorPage(error2)
        }
    }
})

ipcRenderer.send('ready')
