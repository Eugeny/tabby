import type { BrowserWindow, TouchBar } from 'electron'
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
    get isFullscreen (): boolean { return this._isFullScreen}

    private _isFullScreen = false

    constructor (
        zone: NgZone,
        private electron: ElectronService,
        @Inject(BOOTSTRAP_DATA) private bootstrapData: BootstrapData,
    ) {
        super()
        electron.ipcRenderer.on('host:window-enter-full-screen', () => zone.run(() => {
            this._isFullScreen = true
        }))

        electron.ipcRenderer.on('host:window-leave-full-screen', () => zone.run(() => {
            this._isFullScreen = false
        }))

        electron.ipcRenderer.on('host:window-shown', () => {
            zone.run(() => this.windowShown.next())
        })

        electron.ipcRenderer.on('host:window-close-request', () => {
            zone.run(() => this.windowCloseRequest.next())
        })

        electron.ipcRenderer.on('host:window-moved', () => {
            zone.run(() => this.windowMoved.next())
        })

        electron.ipcRenderer.on('host:window-focused', () => {
            zone.run(() => this.windowFocused.next())
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
        this.electron.ipcRenderer.send('window-set-title', title ?? 'Tabby')
    }

    toggleFullscreen (): void {
        this.getWindow().setFullScreen(!this._isFullScreen)
    }

    minimize (): void {
        this.electron.ipcRenderer.send('window-minimize')
    }

    isMaximized (): boolean {
        return this.getWindow().isMaximized()
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

    bringToFront (): void {
        this.electron.ipcRenderer.send('window-bring-to-front')
    }
}
