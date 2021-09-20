import * as glasstron from 'glasstron'

import { Subject, Observable, debounceTime } from 'rxjs'
import { BrowserWindow, app, ipcMain, Rectangle, Menu, screen, BrowserWindowConstructorOptions, TouchBar, nativeImage } from 'electron'
import ElectronConfig = require('electron-config')
import * as os from 'os'
import * as path from 'path'
import macOSRelease from 'macos-release'
import * as compareVersions from 'compare-versions'

import type { Application } from './app'
import { parseArgs } from './cli'
import { loadConfig } from './config'

let DwmEnableBlurBehindWindow: any = null
if (process.platform === 'win32') {
    DwmEnableBlurBehindWindow = require('windows-blurbehind').DwmEnableBlurBehindWindow
}

export interface WindowOptions {
    hidden?: boolean
}

abstract class GlasstronWindow extends BrowserWindow {
    blurType: string
    abstract setBlur (_: boolean)
}

const macOSVibrancyType = process.platform === 'darwin' ? compareVersions.compare(macOSRelease().version, '10.14', '>=') ? 'fullscreen-ui' : 'dark' : null

const activityIcon = nativeImage.createFromPath(`${app.getAppPath()}/assets/activity.png`)

export class Window {
    ready: Promise<void>
    private visible = new Subject<boolean>()
    private closed = new Subject<void>()
    private window?: GlasstronWindow
    private windowConfig: ElectronConfig
    private windowBounds?: Rectangle
    private closing = false
    private lastVibrancy: { enabled: boolean, type?: string } | null = null
    private disableVibrancyWhileDragging = false
    private configStore: any
    private touchBarControl: any

    get visible$ (): Observable<boolean> { return this.visible }
    get closed$ (): Observable<void> { return this.closed }

    constructor (private application: Application, options?: WindowOptions) {
        this.configStore = loadConfig()

        options = options ?? {}

        this.windowConfig = new ElectronConfig({ name: 'window' })
        this.windowBounds = this.windowConfig.get('windowBoundaries')

        const maximized = this.windowConfig.get('maximized')
        const bwOptions: BrowserWindowConstructorOptions = {
            width: 800,
            height: 600,
            title: 'Tabby',
            minWidth: 400,
            minHeight: 300,
            webPreferences: {
                nodeIntegration: true,
                preload: path.join(__dirname, 'sentry.js'),
                backgroundThrottling: false,
                enableRemoteModule: true,
                contextIsolation: false,
            },
            maximizable: true,
            frame: false,
            show: false,
            backgroundColor: '#00000000',
        }

        if (this.windowBounds) {
            Object.assign(bwOptions, this.windowBounds)
            const closestDisplay = screen.getDisplayNearestPoint( { x: this.windowBounds.x, y: this.windowBounds.y } )

            const [left1, top1, right1, bottom1] = [this.windowBounds.x, this.windowBounds.y, this.windowBounds.x + this.windowBounds.width, this.windowBounds.y + this.windowBounds.height]
            const [left2, top2, right2, bottom2] = [closestDisplay.bounds.x, closestDisplay.bounds.y, closestDisplay.bounds.x + closestDisplay.bounds.width, closestDisplay.bounds.y + closestDisplay.bounds.height]

            if ((left2 > right1 || right2 < left1 || top2 > bottom1 || bottom2 < top1) && !maximized) {
                bwOptions.x = closestDisplay.bounds.width / 2 - bwOptions.width / 2
                bwOptions.y = closestDisplay.bounds.height / 2 - bwOptions.height / 2
            }
        }

        if ((this.configStore.appearance || {}).frame === 'native') {
            bwOptions.frame = true
        } else {
            if (process.platform === 'darwin') {
                bwOptions.titleBarStyle = 'hidden'
            }
        }

        if (process.platform === 'darwin') {
            this.window = new BrowserWindow(bwOptions) as GlasstronWindow
        } else {
            this.window = new glasstron.BrowserWindow(bwOptions)
        }

        this.window.once('ready-to-show', () => {
            if (process.platform === 'darwin') {
                this.window.setVibrancy(macOSVibrancyType)
            } else if (process.platform === 'win32' && (this.configStore.appearance || {}).vibrancy) {
                this.setVibrancy(true)
            }

            if (!options.hidden) {
                if (maximized) {
                    this.window.maximize()
                } else {
                    this.window.show()
                }
                this.window.focus()
                this.window.moveTop()
            }
        })

        this.window.on('blur', () => {
            if ((this.configStore.appearance?.dock ?? 'off') !== 'off' && this.configStore.appearance?.dockHideOnBlur) {
                this.hide()
            }
        })

        this.window.loadURL(`file://${app.getAppPath()}/dist/index.html`, { extraHeaders: 'pragma: no-cache\n' })

        this.window.webContents.setVisualZoomLevelLimits(1, 1)
        this.window.webContents.setZoomFactor(1)

        if (process.platform === 'darwin') {
            this.touchBarControl = new TouchBar.TouchBarSegmentedControl({
                segments: [],
                change: index => this.send('touchbar-selection', index),
            })
            this.window.setTouchBar(new TouchBar({
                items: [this.touchBarControl],
            }))
        } else {
            this.window.setMenu(null)
        }

        this.setupWindowManagement()

        this.ready = new Promise(resolve => {
            const listener = event => {
                if (event.sender === this.window.webContents) {
                    ipcMain.removeListener('app:ready', listener as any)
                    resolve()
                }
            }
            ipcMain.on('app:ready', listener)
        })
    }

    setVibrancy (enabled: boolean, type?: string, userRequested?: boolean): void {
        if (userRequested ?? true) {
            this.lastVibrancy = { enabled, type }
        }
        if (process.platform === 'win32') {
            if (parseFloat(os.release()) >= 10) {
                this.window.blurType = enabled ? type === 'fluent' ? 'acrylic' : 'blurbehind' : null
                try {
                    this.window.setBlur(enabled)
                } catch (error) {
                    console.error('Failed to set window blur', error)
                }
            } else {
                DwmEnableBlurBehindWindow(this.window, enabled)
            }
        } else if (process.platform === 'linux') {
            this.window.setBackgroundColor(enabled ? '#00000000' : '#131d27')
            this.window.setBlur(enabled)
        } else {
            this.window.setVibrancy(enabled ? macOSVibrancyType : null)
        }
    }

    show (): void {
        this.window.show()
        this.window.moveTop()
    }

    focus (): void {
        this.window.focus()
    }

    send (event: string, ...args: any[]): void {
        if (!this.window) {
            return
        }
        this.window.webContents.send(event, ...args)
        if (event === 'host:config-change') {
            this.configStore = args[0]
        }
    }

    isDestroyed (): boolean {
        return !this.window || this.window.isDestroyed()
    }

    isFocused (): boolean {
        return this.window.isFocused()
    }

    isVisible (): boolean {
        return this.window.isVisible()
    }

    hide (): void {
        if (process.platform === 'darwin') {
            // Lose focus
            Menu.sendActionToFirstResponder('hide:')
        }
        this.window.blur()
        if (process.platform !== 'darwin') {
            this.window.hide()
        }
    }

    present (): void {
        if (!this.window.isVisible()) {
            // unfocused, invisible
            this.window.show()
            this.window.focus()
        } else {
            if (!this.configStore.appearance?.dock || this.configStore.appearance?.dock === 'off') {
                // not docked, visible
                setTimeout(() => {
                    this.window.show()
                    this.window.focus()
                })
            } else {
                if (this.configStore.appearance?.dockAlwaysOnTop) {
                    // docked, visible, on top
                    this.window.hide()
                } else {
                    // docked, visible, not on top
                    this.window.focus()
                }
            }
        }
    }

    passCliArguments (argv: string[], cwd: string, secondInstance: boolean): void {
        this.send('cli', parseArgs(argv, cwd), cwd, secondInstance)
    }

    private setupWindowManagement () {
        this.window.on('show', () => {
            this.visible.next(true)
            this.send('host:window-shown')
        })

        this.window.on('hide', () => {
            this.visible.next(false)
        })

        const moveSubscription = new Observable<void>(observer => {
            this.window.on('move', () => observer.next())
        }).pipe(debounceTime(250)).subscribe(() => {
            this.send('host:window-moved')
        })

        this.window.on('closed', () => {
            moveSubscription.unsubscribe()
        })

        this.window.on('enter-full-screen', () => this.send('host:window-enter-full-screen'))
        this.window.on('leave-full-screen', () => this.send('host:window-leave-full-screen'))

        this.window.on('close', event => {
            if (!this.closing) {
                event.preventDefault()
                this.send('host:window-close-request')
                return
            }
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

        this.window.on('focus', () => {
            this.send('host:window-focused')
        })

        ipcMain.on('ready', event => {
            if (!this.window || event.sender !== this.window.webContents) {
                return
            }
            this.window.webContents.send('start', {
                config: this.configStore,
                executable: app.getPath('exe'),
                windowID: this.window.id,
                isFirstWindow: this.window.id === 1,
                userPluginsPath: this.application.userPluginsPath,
            })
        })

        ipcMain.on('window-minimize', event => {
            if (!this.window || event.sender !== this.window.webContents) {
                return
            }
            this.window.minimize()
        })

        ipcMain.on('window-set-bounds', (event, bounds) => {
            if (!this.window || event.sender !== this.window.webContents) {
                return
            }
            this.window.setBounds(bounds)
        })

        ipcMain.on('window-set-always-on-top', (event, flag) => {
            if (!this.window || event.sender !== this.window.webContents) {
                return
            }
            this.window.setAlwaysOnTop(flag)
        })

        ipcMain.on('window-set-vibrancy', (event, enabled, type) => {
            if (!this.window || event.sender !== this.window.webContents) {
                return
            }
            this.setVibrancy(enabled, type)
        })

        ipcMain.on('window-set-title', (event, title) => {
            if (!this.window || event.sender !== this.window.webContents) {
                return
            }
            this.window.setTitle(title)
        })

        ipcMain.on('window-bring-to-front', event => {
            if (!this.window || event.sender !== this.window.webContents) {
                return
            }
            if (this.window.isMinimized()) {
                this.window.restore()
            }
            this.window.show()
            this.window.moveTop()
        })

        ipcMain.on('window-close', event => {
            if (!this.window || event.sender !== this.window.webContents) {
                return
            }
            this.closing = true
            this.window.close()
        })

        ipcMain.on('window-set-touch-bar', (_event, segments, selectedIndex) => {
            this.touchBarControl.segments = segments.map(s => ({
                label: s.label,
                icon: s.hasActivity ? activityIcon : undefined,
            }))
            this.touchBarControl.selectedIndex = selectedIndex
        })

        this.window.webContents.on('new-window', event => event.preventDefault())

        ipcMain.on('window-set-disable-vibrancy-while-dragging', (_event, value) => {
            this.disableVibrancyWhileDragging = value
        })

        let moveEndedTimeout: any = null
        const onBoundsChange = () => {
            if (!this.lastVibrancy?.enabled || !this.disableVibrancyWhileDragging) {
                return
            }
            this.setVibrancy(false, undefined, false)
            if (moveEndedTimeout) {
                clearTimeout(moveEndedTimeout)
            }
            moveEndedTimeout = setTimeout(() => {
                this.setVibrancy(this.lastVibrancy.enabled, this.lastVibrancy.type)
            }, 50)
        }
        this.window.on('move', onBoundsChange)
        this.window.on('resize', onBoundsChange)
    }

    private destroy () {
        this.window = null
        this.closed.next()
        this.visible.complete()
        this.closed.complete()
    }
}
