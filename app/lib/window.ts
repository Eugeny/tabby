import { Subject, Observable } from 'rxjs'
import { BrowserWindow, app, ipcMain } from 'electron'
import ElectronConfig = require('electron-config')
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import * as path from 'path'

let electronVibrancy: any
if (process.platform !== 'linux') {
    electronVibrancy = require('electron-vibrancy')
}

export class Window {
    ready: Promise<void>
    private visible = new Subject<boolean>()
    private window: BrowserWindow
    private vibrancyViewID: number
    private windowConfig: ElectronConfig

    get visible$ (): Observable<boolean> { return this.visible }

    constructor () {
        let configPath = path.join(app.getPath('userData'), 'config.yaml')
        let configData
        if (fs.existsSync(configPath)) {
            configData = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))
        } else {
            configData = {}
        }

        this.windowConfig = new ElectronConfig({ name: 'window' })

        let options: Electron.BrowserWindowConstructorOptions = {
            width: 800,
            height: 600,
            title: 'Terminus',
            minWidth: 400,
            minHeight: 300,
            webPreferences: { webSecurity: false },
            frame: false,
            show: false,
        }
        Object.assign(options, this.windowConfig.get('windowBoundaries'))

        if ((configData.appearance || {}).frame === 'native') {
            options.frame = true
        } else {
            if (process.platform === 'darwin') {
                options.titleBarStyle = 'hiddenInset'
            }
        }

        if (process.platform === 'win32' && (configData.appearance || {}).vibrancy) {
            options.transparent = true
        }

        if (process.platform === 'linux') {
            options.backgroundColor = '#131d27'
        }

        this.window = new BrowserWindow(options)
        this.window.once('ready-to-show', () => {
            if (process.platform === 'darwin') {
                this.window.setVibrancy('dark')
            } else if (process.platform === 'win32' && (configData.appearance || {}).vibrancy) {
                this.setVibrancy(true)
            }
            this.window.show()
            this.window.focus()
        })
        this.window.loadURL(`file://${app.getAppPath()}/dist/index.html?${this.window.id}`, { extraHeaders: 'pragma: no-cache\n' })

        if (process.platform !== 'darwin') {
            this.window.setMenu(null)
        }

        this.setupWindowManagement()

        this.ready = new Promise(resolve => {
            const listener = event => {
                if (event.sender === this.window.webContents) {
                    ipcMain.removeListener('app:ready', listener)
                    resolve()
                }
            }
            ipcMain.on('app:ready', listener)
        })
    }

    setVibrancy (enabled: boolean) {
        if (enabled && !this.vibrancyViewID) {
            this.vibrancyViewID = electronVibrancy.SetVibrancy(this.window, 0)
        } else if (!enabled && this.vibrancyViewID) {
            electronVibrancy.RemoveView(this.window, this.vibrancyViewID)
            this.vibrancyViewID = null
        }
    }

    show () {
        this.window.show()
    }

    focus () {
        this.window.focus()
    }

    send (event, ...args) {
        this.window.webContents.send(event, ...args)
    }

    private setupWindowManagement () {
        this.window.on('show', () => {
            this.visible.next(true)
            this.window.webContents.send('host:window-shown')
        })

        this.window.on('hide', () => {
            this.visible.next(false)
        })

        this.window.on('enter-full-screen', () => this.window.webContents.send('host:window-enter-full-screen'))
        this.window.on('leave-full-screen', () => this.window.webContents.send('host:window-leave-full-screen'))

        this.window.on('close', () => {
            this.windowConfig.set('windowBoundaries', this.window.getBounds())
        })

        this.window.on('closed', () => {
            this.destroy()
        })

        ipcMain.on('window-focus', () => {
            this.window.focus()
        })

        ipcMain.on('window-maximize', () => {
            this.window.maximize()
        })

        ipcMain.on('window-unmaximize', () => {
            this.window.unmaximize()
        })

        ipcMain.on('window-toggle-maximize', () => {
            if (this.window.isMaximized()) {
                this.window.unmaximize()
            } else {
                this.window.maximize()
            }
        })

        ipcMain.on('window-minimize', () => {
            this.window.minimize()
        })

        ipcMain.on('window-set-bounds', (_event, bounds) => {
            this.window.setBounds(bounds)
        })

        ipcMain.on('window-set-always-on-top', (_event, flag) => {
            this.window.setAlwaysOnTop(flag)
        })

        ipcMain.on('window-set-vibrancy', (_event, enabled) => {
            this.setVibrancy(enabled)
        })
    }

    private destroy () {
        this.window = null
        this.visible.complete()
    }
}
