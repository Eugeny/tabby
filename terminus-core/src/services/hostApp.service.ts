import type { BrowserWindow, TouchBar } from 'electron'
import { Observable, Subject } from 'rxjs'
import { Injectable, NgZone, EventEmitter, Injector, Inject } from '@angular/core'
import { ElectronService } from './electron.service'
import { Logger, LogService } from './log.service'
import { CLIHandler } from '../api/cli'
import { BootstrapData, BOOTSTRAP_DATA } from '../api/mainProcess'
import { isWindowsBuild, WIN_BUILD_FLUENT_BG_SUPPORTED } from '../utils'

export enum Platform {
    Linux = 'Linux',
    macOS = 'macOS',
    Windows = 'Windows',
    Web = 'Web',
}

export interface Bounds {
    x: number
    y: number
    width: number
    height: number
}

/**
 * Provides interaction with the main process
 */
@Injectable({ providedIn: 'root' })
export class HostAppService {
    platform: Platform
    configPlatform: Platform

    /**
     * Fired once the window is visible
     */
    shown = new EventEmitter<any>()
    isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE

    private preferencesMenu = new Subject<void>()
    private configChangeBroadcast = new Subject<void>()
    private windowCloseRequest = new Subject<void>()
    private windowMoved = new Subject<void>()
    private windowFocused = new Subject<void>()
    private displayMetricsChanged = new Subject<void>()
    private displaysChanged = new Subject<void>()
    private logger: Logger

    /**
     * Fired when Preferences is selected in the macOS menu
     */
    get preferencesMenu$ (): Observable<void> { return this.preferencesMenu }

    /**
     * Fired when another window modified the config file
     */
    get configChangeBroadcast$ (): Observable<void> { return this.configChangeBroadcast }

    /**
     * Fired when the window close button is pressed
     */
    get windowCloseRequest$ (): Observable<void> { return this.windowCloseRequest }

    get windowMoved$ (): Observable<void> { return this.windowMoved }

    get windowFocused$ (): Observable<void> { return this.windowFocused }

    get displayMetricsChanged$ (): Observable<void> { return this.displayMetricsChanged }

    get displaysChanged$ (): Observable<void> { return this.displaysChanged }

    private constructor (
        private zone: NgZone,
        private electron: ElectronService,
        @Inject(BOOTSTRAP_DATA) private bootstrapData: BootstrapData,
        injector: Injector,
        log: LogService,
    ) {
        this.logger = log.create('hostApp')
        this.configPlatform = this.platform = {
            win32: Platform.Windows,
            darwin: Platform.macOS,
            linux: Platform.Linux,
        }[process.platform]

        if (process.env.XWEB) {
            this.platform = Platform.Web
        }

        electron.ipcRenderer.on('host:preferences-menu', () => this.zone.run(() => this.preferencesMenu.next()))

        electron.ipcRenderer.on('uncaughtException', (_$event, err) => {
            this.logger.error('Unhandled exception:', err)
        })

        electron.ipcRenderer.on('host:window-shown', () => {
            this.zone.run(() => this.shown.emit())
        })

        electron.ipcRenderer.on('host:window-close-request', () => {
            this.zone.run(() => this.windowCloseRequest.next())
        })

        electron.ipcRenderer.on('host:window-moved', () => {
            this.zone.run(() => this.windowMoved.next())
        })

        electron.ipcRenderer.on('host:window-focused', () => {
            this.zone.run(() => this.windowFocused.next())
        })

        electron.ipcRenderer.on('host:display-metrics-changed', () => {
            this.zone.run(() => this.displayMetricsChanged.next())
        })

        electron.ipcRenderer.on('host:displays-changed', () => {
            this.zone.run(() => this.displaysChanged.next())
        })

        electron.ipcRenderer.on('cli', (_$event, argv: any, cwd: string, secondInstance: boolean) => this.zone.run(async () => {
            const event = { argv, cwd, secondInstance }
            this.logger.info('CLI arguments received:', event)

            const cliHandlers = injector.get(CLIHandler) as unknown as CLIHandler[]
            cliHandlers.sort((a, b) => b.priority - a.priority)

            let handled = false
            for (const handler of cliHandlers) {
                if (handled && handler.firstMatchOnly) {
                    continue
                }
                if (await handler.handle(event)) {
                    this.logger.info('CLI handler matched:', handler.constructor.name)
                    handled = true
                }
            }
        }))

        electron.ipcRenderer.on('host:config-change', () => this.zone.run(() => {
            this.configChangeBroadcast.next()
        }))

        if (isWindowsBuild(WIN_BUILD_FLUENT_BG_SUPPORTED)) {
            electron.ipcRenderer.send('window-set-disable-vibrancy-while-dragging', true)
        }
    }

    /**
     * Returns the current remote [[BrowserWindow]]
     */
    getWindow (): BrowserWindow {
        return this.electron.BrowserWindow.fromId(this.bootstrapData.windowID)!
    }

    newWindow (): void {
        this.electron.ipcRenderer.send('app:new-window')
    }

    openDevTools (): void {
        this.getWindow().webContents.openDevTools({ mode: 'undocked' })
    }

    focusWindow (): void {
        this.electron.ipcRenderer.send('window-focus')
    }

    setBounds (bounds: Bounds): void {
        this.electron.ipcRenderer.send('window-set-bounds', bounds)
    }

    setAlwaysOnTop (flag: boolean): void {
        this.electron.ipcRenderer.send('window-set-always-on-top', flag)
    }

    setTouchBar (touchBar: TouchBar): void {
        this.getWindow().setTouchBar(touchBar)
    }

    /**
     * Notifies other windows of config file changes
     */
    broadcastConfigChange (configStore: Record<string, any>): void {
        this.electron.ipcRenderer.send('app:config-change', configStore)
    }

    emitReady (): void {
        this.electron.ipcRenderer.send('app:ready')
    }

    bringToFront (): void {
        this.electron.ipcRenderer.send('window-bring-to-front')
    }

    registerGlobalHotkey (specs: string[]): void {
        this.electron.ipcRenderer.send('app:register-global-hotkey', specs)
    }

    relaunch (): void {
        if (this.isPortable) {
            this.electron.app.relaunch({ execPath: process.env.PORTABLE_EXECUTABLE_FILE })
        } else {
            this.electron.app.relaunch()
        }
        this.electron.app.exit()
    }

    quit (): void {
        this.logger.info('Quitting')
        this.electron.app.quit()
    }
}
