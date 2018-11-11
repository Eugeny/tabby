import { Subject, Observable } from 'rxjs'
import { BrowserWindow, app, ipcMain, Rectangle } from 'electron'
import ElectronConfig = require('electron-config')
import * as os from 'os'

import { loadConfig } from './config'

let SetWindowCompositionAttribute: any
let AccentState: any
let DwmEnableBlurBehindWindow: any
if (process.platform === 'win32') {
    SetWindowCompositionAttribute = require('windows-swca').SetWindowCompositionAttribute
    AccentState = require('windows-swca').AccentState
    DwmEnableBlurBehindWindow = require('windows-blurbehind').DwmEnableBlurBehindWindow
}

export interface WindowOptions {
    hidden?: boolean
}

export class Window {
    ready: Promise<void>
    private visible = new Subject<boolean>()
    private window: BrowserWindow
    private windowConfig: ElectronConfig
    private windowBounds: Rectangle

    get visible$ (): Observable<boolean> { return this.visible }

    constructor (options?: WindowOptions) {
        let configData = loadConfig()

        options = options || {}

        this.windowConfig = new ElectronConfig({ name: 'window' })
        this.windowBounds = this.windowConfig.get('windowBoundaries')

        let maximized = this.windowConfig.get('maximized')
        let bwOptions: Electron.BrowserWindowConstructorOptions = {
            width: 800,
            height: 600,
            title: 'Terminus',
            minWidth: 400,
            minHeight: 300,
            webPreferences: { webSecurity: false },
            frame: false,
            show: false,
            backgroundColor: '#00000000'
        }
        Object.assign(bwOptions, this.windowBounds)

        if ((configData.appearance || {}).frame === 'native') {
            bwOptions.frame = true
        } else {
            if (process.platform === 'darwin') {
                bwOptions.titleBarStyle = 'hiddenInset'
            }
        }

        if (process.platform === 'linux') {
            bwOptions.backgroundColor = '#131d27'
        }

        this.window = new BrowserWindow(bwOptions)
        this.window.once('ready-to-show', () => {
            if (process.platform === 'darwin') {
                this.window.setVibrancy('dark')
            } else if (process.platform === 'win32' && (configData.appearance || {}).vibrancy) {
                this.setVibrancy(true)
            }

            if (!options.hidden) {
                if (maximized) {
                    this.window.maximize()
                } else {
                    this.window.show()
                }
                this.window.focus()
            }
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

    setVibrancy (enabled: boolean, type?: string) {
        if (process.platform === 'win32') {
            if (parseFloat(os.release()) >= 10) {
                let attribValue = AccentState.ACCENT_DISABLED
                let color = 0x00000000
                if (enabled) {
                    if (parseInt(os.release().split('.')[2]) >= 17063 && type === 'fluent') {
                        attribValue = AccentState.ACCENT_ENABLE_FLUENT
                        color = 0x01000000 // using a small alpha because acrylic bugs out at full transparency.
                    } else {
                        attribValue = AccentState.ACCENT_ENABLE_BLURBEHIND
                    }
                }
                SetWindowCompositionAttribute(this.window, attribValue, color)
            } else {
                DwmEnableBlurBehindWindow(this.window, enabled)
            }
        }
    }

    show () {
        this.window.show()
    }

    focus () {
        this.window.focus()
    }

    send (event, ...args) {
        if (!this.window) {
            return
        }
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
            this.windowConfig.set('windowBoundaries', this.windowBounds)
            this.windowConfig.set('maximized', this.window.isMaximized())
        })

        this.window.on('closed', () => {
            this.destroy()
        })

        this.window.on('resize', () => {
            if (!this.window.isMaximized()) {
                this.windowBounds = this.window.getBounds()
            }
        })

        this.window.on('move', () => {
            if (!this.window.isMaximized()) {
                this.windowBounds = this.window.getBounds()
            }
        })

        ipcMain.on('window-focus', event => {
            if (event.sender !== this.window.webContents) {
                return
            }
            this.window.focus()
        })

        ipcMain.on('window-maximize', event => {
            if (event.sender !== this.window.webContents) {
                return
            }
            this.window.maximize()
        })

        ipcMain.on('window-unmaximize', event => {
            if (event.sender !== this.window.webContents) {
                return
            }
            this.window.unmaximize()
        })

        ipcMain.on('window-toggle-maximize', event => {
            if (event.sender !== this.window.webContents) {
                return
            }
            if (this.window.isMaximized()) {
                this.window.unmaximize()
            } else {
                this.window.maximize()
            }
        })

        ipcMain.on('window-minimize', event => {
            if (event.sender !== this.window.webContents) {
                return
            }
            this.window.minimize()
        })

        ipcMain.on('window-set-bounds', (event, bounds) => {
            if (event.sender !== this.window.webContents) {
                return
            }
            this.window.setBounds(bounds)
        })

        ipcMain.on('window-set-always-on-top', (event, flag) => {
            if (event.sender !== this.window.webContents) {
                return
            }
            this.window.setAlwaysOnTop(flag)
        })

        ipcMain.on('window-set-vibrancy', (event, enabled, type) => {
            if (event.sender !== this.window.webContents) {
                return
            }
            this.setVibrancy(enabled, type)
        })

        ipcMain.on('window-set-title', (event, title) => {
            if (event.sender !== this.window.webContents) {
                return
            }
            this.window.setTitle(title)
        })

        ipcMain.on('window-bring-to-front', event => {
            if (event.sender !== this.window.webContents) {
                return
            }
            if (this.window.isMinimized()) {
                this.window.restore()
            }
            this.window.show()
            this.window.moveTop()
        })

        this.window.webContents.on('new-window', event => event.preventDefault())
    }

    private destroy () {
        this.window = null
        this.visible.complete()
    }
}
