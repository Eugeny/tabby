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
        plugins = plugins.filter(x => x.isBuiltin)
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
    const el = document.querySelector('.preload-logo div')!

    const errorMessage = String(error?.message || error?.stack || error || 'Unknown error')
    el.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; max-width: 520px;">
            <h1 style="color: #e06c75; font-size: 22px; font-weight: 600; margin-bottom: 16px; font-family: -apple-system, sans-serif;">
                Startup Failed
            </h1>
            <p style="color: #abb2bf; font-size: 14px; margin-bottom: 12px; line-height: 1.7; font-family: -apple-system, sans-serif;">
                Tabby could not start because the installation appears to be corrupted.<br>
                This typically happens when an automatic update did not complete properly.
            </p>
            <pre style="background: #1e222a; color: #e06c75; padding: 12px; border-radius: 6px;
                font-size: 12px; text-align: left; overflow-x: auto; margin: 16px 0; white-space: pre-wrap;
                word-break: break-all; max-height: 180px; font-family: 'SF Mono', 'Cascadia Code', monospace;
                border: 1px solid #3e4451;">${errorMessage}</pre>
            <p style="color: #abb2bf; font-size: 13px; line-height: 1.8; font-family: -apple-system, sans-serif;">
                <strong style="color: #e5c07b;">To fix this:</strong><br>
                1. Download the latest version from
                <a href="https://github.com/Eugeny/tabby/releases"
                   style="color: #61afef; text-decoration: underline;">GitHub Releases</a><br>
                2. Run the installer to reinstall — your settings will be preserved<br><br>
                Press <kbd style="background: #3e4451; padding: 2px 7px; border-radius: 3px; border: 1px solid #5c6370;
                font-family: monospace;">Ctrl+Shift+I</kbd> to open DevTools for detailed logs.
            </p>
        </div>
    `
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
