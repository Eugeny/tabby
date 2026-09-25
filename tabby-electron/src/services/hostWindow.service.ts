import type { BrowserWindow, TouchBar } from 'electron'
import { Subject, asyncScheduler, distinctUntilChanged, throttleTime } from 'rxjs'
import { Injectable, Inject, NgZone } from '@angular/core'
import { BootstrapData, BOOTSTRAP_DATA, HostWindowService } from 'tabby-core'
import { ElectronService } from '../services/electron.service'

export interface Bounds {
    x: number
    y: number
    width: number
    height: number
}

@Injectable({ providedIn: 'root' })
export class ElectronHostWindow extends HostWindowService {
    get isFullscreen (): boolean { return this._isFullscreen }

    private _isFullscreen = false
    private _isMaximized = false

    /**
     * Native window title updates. Terminal apps often animate their title (spinners at
     * 10-30 Hz), and every change of the active tab's title used to become a native
     * setTitle call - on macOS 26 each one runs a WindowManagement/SwiftUI transaction on the
     * main thread. Apply the first change immediately, then at most once per second, always
     * ending on the latest title.
     */
    private windowTitle = new Subject<string>()

    constructor (
        zone: NgZone,
        private electron: ElectronService,
        @Inject(BOOTSTRAP_DATA) private bootstrapData: BootstrapData,
    ) {
        super()
        electron.ipcRenderer.on('host:window-enter-full-screen', () => zone.run(() => {
            this._isFullscreen = true
        }))

        electron.ipcRenderer.on('host:window-leave-full-screen', () => zone.run(() => {
            this._isFullscreen = false
        }))

        electron.ipcRenderer.on('host:window-shown', () => zone.run(() => this.windowShown.next()))

        electron.ipcRenderer.on('host:window-close-request', () => zone.run(() => {
            this.windowCloseRequest.next()
        }))

        electron.ipcRenderer.on('host:window-moved', () => zone.run(() => {
            this.windowMoved.next()
        }))

        electron.ipcRenderer.on('host:window-focused', () => zone.run(() => {
            this.windowFocused.next()
        }))

        electron.ipcRenderer.on('host:became-main-window', () => zone.run(() => {
            this.bootstrapData.isMainWindow = true
        }))

        electron.ipcRenderer.on('host:window-maximized', () => zone.run(() => {
            this._isMaximized = true
        }))

        electron.ipcRenderer.on('host:window-unmaximized', () => zone.run(() => {
            this._isMaximized = false
        }))

        this._isMaximized = this.getWindow().isMaximized()

        zone.runOutsideAngular(() => {
            this.windowTitle.pipe(
                throttleTime(1000, asyncScheduler, { leading: true, trailing: true }),
                distinctUntilChanged(),
            ).subscribe(title => {
                this.electron.ipcRenderer.send('window-set-title', title)
            })
        })
    }

    getWindow (): BrowserWindow {
        return this.electron.BrowserWindow.fromId(this.bootstrapData.windowID)!
    }

    openDevTools (): void {
        this.getWindow().webContents.openDevTools({ mode: 'undocked' })
    }

    reload (): void {
        this.getWindow().reload()
    }

    setTitle (title?: string): void {
        this.windowTitle.next(title ?? 'Tabby')
    }

    toggleFullscreen (): void {
        this.getWindow().setFullScreen(!this._isFullscreen)
    }

    minimize (): void {
        this.electron.ipcRenderer.send('window-minimize')
    }

    isMaximized (): boolean {
        return this._isMaximized
    }

    toggleMaximize (): void {
        if (this.getWindow().isMaximized()) {
            this.getWindow().unmaximize()
        } else {
            this.getWindow().maximize()
        }
    }

    close (): void {
        this.electron.ipcRenderer.send('window-close')
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

    setTrafficLightPosition (x: number, y: number): void {
        this.electron.ipcRenderer.send('window-set-traffic-light-position', x, y)
    }

    setOpacity (opacity: number): void {
        this.electron.ipcRenderer.send('window-set-opacity', opacity)
    }

    setProgressBar (value: number): void {
        this.electron.ipcRenderer.send('window-set-progress-bar', value)
    }

    bringToFront (): void {
        this.electron.ipcRenderer.send('window-bring-to-front')
    }

    flashFrame (): void {
        this.electron.ipcRenderer.send('window-flash-frame')
    }
}
