import { Injectable, NgZone } from '@angular/core'
import { Observable, Subject } from 'rxjs'
import { ElectronService, HostAppService, HostWindowService } from 'terminus-core'

@Injectable({ providedIn: 'root' })
export class ElectronHostWindow extends HostWindowService {
    get closeRequest$ (): Observable<void> { return this.closeRequest }
    get isFullscreen (): boolean { return this._isFullScreen}

    private closeRequest = new Subject<void>()
    private _isFullScreen = false

    constructor (
        private electron: ElectronService,
        private hostApp: HostAppService,
        zone: NgZone,
    ) {
        super()
        electron.ipcRenderer.on('host:window-enter-full-screen', () => zone.run(() => {
            this._isFullScreen = true
        }))

        electron.ipcRenderer.on('host:window-leave-full-screen', () => zone.run(() => {
            this._isFullScreen = false
        }))
    }

    reload (): void {
        this.hostApp.getWindow().reload()
    }

    setTitle (title?: string): void {
        this.electron.ipcRenderer.send('window-set-title', title ?? 'Terminus')
    }

    toggleFullscreen (): void {
        this.hostApp.getWindow().setFullScreen(!this._isFullScreen)
    }

    minimize (): void {
        this.electron.ipcRenderer.send('window-minimize')
    }

    toggleMaximize (): void {
        this.electron.ipcRenderer.send('window-toggle-maximize')
    }

    close (): void {
        this.electron.ipcRenderer.send('window-close')
    }
}
