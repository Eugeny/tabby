import { app, ipcMain, Menu, Tray, shell, screen, globalShortcut, MenuItemConstructorOptions, WebContents } from 'electron'
import promiseIpc from 'electron-promise-ipc'
import * as remote from '@electron/remote/main'
import { exec } from 'mz/child_process'
import * as path from 'path'
import * as fs from 'fs'
import { Subject, throttleTime } from 'rxjs'

import { saveConfig } from './config'
import { Window, WindowOptions } from './window'
import { pluginManager } from './pluginManager'
import { PTYManager } from './pty'

/* eslint-disable block-scoped-var */

try {
    var wnr = require('windows-native-registry') // eslint-disable-line @typescript-eslint/no-var-requires, no-var
} catch (_) { }

export class Application {
    private tray?: Tray
    private ptyManager = new PTYManager()
    private windows: Window[] = []
    private globalHotkey$ = new Subject<void>()
    private quitRequested = false
    userPluginsPath: string

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor (private configStore: any) {
        remote.initialize()
        this.useBuiltinGraphics()
        this.ptyManager.init(this)

        ipcMain.handle('app:save-config', async (event, config) => {
            await saveConfig(config)
            this.broadcastExcept('host:config-change', event.sender, config)
        })

        ipcMain.on('app:register-global-hotkey', (_event, specs) => {
            globalShortcut.unregisterAll()
            for (const spec of specs) {
                globalShortcut.register(spec, () => this.globalHotkey$.next())
            }
        })

        this.globalHotkey$.pipe(throttleTime(100)).subscribe(() => {
            this.onGlobalHotkey()
        })

        ;(promiseIpc as any).on('plugin-manager:install', (name, version) => {
            return pluginManager.install(this.userPluginsPath, name, version)
        })

        ;(promiseIpc as any).on('plugin-manager:uninstall', (name) => {
            return pluginManager.uninstall(this.userPluginsPath, name)
        })

        ;(promiseIpc as any).on('get-default-mac-shell', async () => {
            try {
                return (await exec(`/usr/bin/dscl . -read /Users/${process.env.LOGNAME} UserShell`))[0].toString().split(' ')[1].trim()
            } catch {
                return '/bin/bash'
            }
        })

        if (process.platform === 'linux') {
            app.commandLine.appendSwitch('no-sandbox')
            if (((this.configStore.appearance || {}).opacity || 1) !== 1) {
                app.commandLine.appendSwitch('enable-transparent-visuals')
                app.disableHardwareAcceleration()
            }
        }
        if (this.configStore.hacks?.disableGPU) {
            app.commandLine.appendSwitch('disable-gpu')
            app.disableHardwareAcceleration()
        }

        this.userPluginsPath = path.join(
            app.getPath('userData'),
            'plugins',
        )

        if (!fs.existsSync(this.userPluginsPath)) {
            fs.mkdirSync(this.userPluginsPath)
        }

        app.commandLine.appendSwitch('disable-http-cache')
        app.commandLine.appendSwitch('max-active-webgl-contexts', '9000')
        app.commandLine.appendSwitch('lang', 'EN')

        for (const flag of this.configStore.flags || [['force_discrete_gpu', '0']]) {
            app.commandLine.appendSwitch(flag[0], flag[1])
        }

        app.on('before-quit', () => {
            this.quitRequested = true
        })

        app.on('window-all-closed', () => {
            if (this.quitRequested || process.platform !== 'darwin') {
                app.quit()
            }
        })
    }

    init (): void {
        screen.on('display-metrics-changed', () => this.broadcast('host:display-metrics-changed'))
        screen.on('display-added', () => this.broadcast('host:displays-changed'))
        screen.on('display-removed', () => this.broadcast('host:displays-changed'))
    }

    async newWindow (options?: WindowOptions): Promise<Window> {
        const window = new Window(this, this.configStore, options)
        this.windows.push(window)
        if (this.windows.length === 1){
            window.makeMain()
        }
        window.visible$.subscribe(visible => {
            if (visible) {
                this.disableTray()
            } else {
                this.enableTray()
            }
        })
        window.closed$.subscribe(() => {
            this.windows = this.windows.filter(x => x !== window)
            if (!this.windows.some(x => x.isMainWindow)) {
                this.windows[0]?.makeMain()
                this.windows[0]?.present()
            }
        })
        if (process.platform === 'darwin') {
            this.setupMenu()
        }
        await window.ready
        return window
    }

    onGlobalHotkey (): void {
        let isPresent = this.windows.some(x => x.isFocused() && x.isVisible())
        const isDockedOnTop = this.windows.some(x => x.isDockedOnTop())
        if (isDockedOnTop) {
            // if docked and on top, hide even if not focused right now
            isPresent = this.windows.some(x => x.isVisible())
        }

        if (isPresent) {
            for (const window of this.windows) {
                window.hide()
            }
        } else {
            for (const window of this.windows) {
                window.present()
            }
        }
    }

    presentAllWindows (): void {
        for (const window of this.windows) {
            window.present()
        }
    }

    broadcast (event: string, ...args: any[]): void {
        for (const window of this.windows) {
            window.send(event, ...args)
        }
    }

    broadcastExcept (event: string, except: WebContents, ...args: any[]): void {
        for (const window of this.windows) {
            if (window.webContents.id === except.id) {
                window.send(event, ...args)
            }
        }
    }

    async send (event: string, ...args: any[]): Promise<void> {
        if (!this.hasWindows()) {
            await this.newWindow()
        }
        this.windows.filter(w => !w.isDestroyed())[0].send(event, ...args)
    }

    enableTray (): void {
        if (this.tray || process.platform === 'linux') {
            return
        }
        if (process.platform === 'darwin') {
            this.tray = new Tray(`${app.getAppPath()}/assets/tray-darwinTemplate.png`)
            this.tray.setPressedImage(`${app.getAppPath()}/assets/tray-darwinHighlightTemplate.png`)
        } else {
            this.tray = new Tray(`${app.getAppPath()}/assets/tray.png`)
        }

        this.tray.on('click', () => setTimeout(() => this.focus()))

        const contextMenu = Menu.buildFromTemplate([{
            label: 'Show',
            click: () => this.focus(),
        }])

        if (process.platform !== 'darwin') {
            this.tray.setContextMenu(contextMenu)
        }

        this.tray.setToolTip(`Tabby ${app.getVersion()}`)
    }

    disableTray (): void {
        if (process.platform === 'linux') {
            return
        }
        this.tray?.destroy()
        this.tray = null
    }

    hasWindows (): boolean {
        return !!this.windows.length
    }

    focus (): void {
        for (const window of this.windows) {
            window.present()
        }
    }

    async handleSecondInstance (argv: string[], cwd: string): Promise<void> {
        if (!this.windows.length) {
            await this.newWindow()
        }
        this.presentAllWindows()
        this.windows[this.windows.length - 1].passCliArguments(argv, cwd, true)
    }

    private useBuiltinGraphics (): void {
        if (process.platform === 'win32') {
            const keyPath = 'SOFTWARE\\Microsoft\\DirectX\\UserGpuPreferences'
            const valueName = app.getPath('exe')
            if (!wnr.getRegistryValue(wnr.HK.CU, keyPath, valueName)) {
                wnr.setRegistryValue(wnr.HK.CU, keyPath, valueName, wnr.REG.SZ, 'GpuPreference=1;')
            }
        }
    }

    private setupMenu () {
        const template: MenuItemConstructorOptions[] = [
            {
                label: 'Application',
                submenu: [
                    { role: 'about', label: 'About Tabby' },
                    { type: 'separator' },
                    {
                        label: 'Preferences',
                        accelerator: 'Cmd+,',
                        click: async () => {
                            if (!this.hasWindows()) {
                                await this.newWindow()
                            }
                            this.windows[0].send('host:preferences-menu')
                        },
                    },
                    { type: 'separator' },
                    { role: 'services', submenu: [] },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    {
                        label: 'Quit',
                        accelerator: 'Cmd+Q',
                        click: () => {
                            this.quitRequested = true
                            app.quit()
                        },
                    },
                ],
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                ],
            },
            {
                label: 'View',
                submenu: [
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' },
                ],
            },
            {
                role: 'window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'zoom' },
                    { type: 'separator' },
                    { role: 'front' },
                ],
            },
            {
                role: 'help',
                submenu: [
                    {
                        label: 'Website',
                        click () {
                            shell.openExternal('https://eugeny.github.io/tabby')
                        },
                    },
                ],
            },
        ]

        if (process.env.TABBY_DEV) {
            template[2].submenu['unshift']({ role: 'reload' })
        }

        Menu.setApplicationMenu(Menu.buildFromTemplate(template))
    }
}
