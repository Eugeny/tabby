import type { BrowserWindow, TouchBar } from 'electron'
import { Injectable, Inject, NgZone } from '@angular/core'
import { BootstrapData, BOOTSTRAP_DATA, HostWindowService, RecoveryToken, TabDragPreview } from 'tabby-core'
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

        electron.ipcRenderer.on('host:tab-drag-over', (_$event, screenX: number, screenY: number, title: string) => zone.run(() => {
            this.tabDragOver.next({ screenX, screenY, title })
        }))

        electron.ipcRenderer.on('host:tab-drag-leave', () => zone.run(() => {
            this.tabDragOver.next(null)
        }))

        electron.ipcRenderer.on('host:receive-tab', (_$event, requestID: string, token: RecoveryToken, screenX?: number, screenY?: number) => zone.run(() => {
            this.tabTransferRequest.next({
                token,
                screenX,
                screenY,
                respond: accepted => electron.ipcRenderer.send('app:receive-tab-result', requestID, accepted),
            })
        }))

        this._isMaximized = this.getWindow().isMaximized()
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

    supportsTabTransfer (): boolean {
        return true
    }

    async findWindowAt (screenX: number, screenY: number): Promise<number|null> {
        return this.electron.ipcRenderer.invoke('app:find-window-at', screenX, screenY)
    }

    async sendTab (token: RecoveryToken, targetWindow: number|null, screenX: number, screenY: number, grabX: number, grabY: number): Promise<boolean> {
        // Recovery tokens are plain JSON, but might contain config proxies that IPC can't clone
        const plainToken = JSON.parse(JSON.stringify(token))
        return this.electron.ipcRenderer.invoke('app:send-tab', plainToken, targetWindow, screenX, screenY, grabX, grabY)
    }

    moveTo (screenX: number, screenY: number, grabX: number, grabY: number): void {
        this.electron.ipcRenderer.send('window-move-to', screenX, screenY, grabX, grabY)
    }

    startTabDragPreview (preview: TabDragPreview): void {
        this.electron.ipcRenderer.send('app:tab-drag-preview:start', {
            rect: preview.rect,
            grab: { x: preview.grabX, y: preview.grabY },
            title: preview.title,
            fontFamily: preview.fontFamily,
            fontSize: preview.fontSize,
            background: preview.background,
            foreground: preview.foreground,
            accent: preview.accent,
            movesWindow: preview.movesWindow,
            labels: preview.labels,
        })
    }

    moveTabDragPreview (screenX: number, screenY: number): void {
        this.electron.ipcRenderer.send('app:tab-drag-preview:move', screenX, screenY)
    }

    endTabDragPreview (): void {
        this.electron.ipcRenderer.send('app:tab-drag-preview:end')
    }
}
