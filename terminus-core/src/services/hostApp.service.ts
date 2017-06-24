import { Injectable, NgZone, EventEmitter } from '@angular/core'
import { ElectronService } from '../services/electron.service'
import { Logger, LogService } from '../services/log.service'

export enum Platform {
    Linux, macOS, Windows,
}

export interface Bounds {
    x: number
    y: number
    width: number
    height: number
}

@Injectable()
export class HostAppService {
    platform: Platform
    nodePlatform: string
    quitRequested = new EventEmitter<any>()
    ready = new EventEmitter<any>()
    shown = new EventEmitter<any>()
    secondInstance = new EventEmitter<any>()

    private logger: Logger

    constructor (
        private zone: NgZone,
        private electron: ElectronService,
        log: LogService,
    ) {
        this.logger = log.create('hostApp')
        this.nodePlatform = require('os').platform()
        this.platform = {
            win32: Platform.Windows,
            darwin: Platform.macOS,
            linux: Platform.Linux
        }[this.nodePlatform]

        electron.ipcRenderer.on('host:quit-request', () => this.zone.run(() => this.quitRequested.emit()))

        electron.ipcRenderer.on('uncaughtException', (err) => {
            this.logger.error('Unhandled exception:', err)
        })

        electron.ipcRenderer.on('host:window-shown', () => {
            this.shown.emit()
        })

        electron.ipcRenderer.on('host:second-instance', () => {
            this.secondInstance.emit()
        })

        this.ready.subscribe(() => {
            electron.ipcRenderer.send('app:ready')
        })
    }

    getWindow () {
        return this.electron.app.window
    }

    getShell () {
        return this.electron.shell
    }

    getAppPath () {
        return this.electron.app.getAppPath()
    }

    getPath (type: string) {
        return this.electron.app.getPath(type)
    }

    openDevTools () {
        this.getWindow().webContents.openDevTools()
    }

    setCloseable (flag: boolean) {
        this.electron.ipcRenderer.send('window-set-closeable', flag)
    }

    focusWindow () {
        this.electron.ipcRenderer.send('window-focus')
    }

    toggleWindow () {
        this.electron.ipcRenderer.send('window-toggle-focus')
    }

    minimize () {
        this.electron.ipcRenderer.send('window-minimize')
    }

    maximize () {
        this.electron.ipcRenderer.send('window-maximize')
    }

    unmaximize () {
        this.electron.ipcRenderer.send('window-unmaximize')
    }

    toggleMaximize () {
        this.electron.ipcRenderer.send('window-toggle-maximize')
    }

    setBounds (bounds: Bounds) {
        this.electron.ipcRenderer.send('window-set-bounds', bounds)
    }

    setAlwaysOnTop (flag: boolean) {
        this.electron.ipcRenderer.send('window-set-always-on-top', flag)
    }

    quit () {
        this.logger.info('Quitting')
        this.electron.app.quit()
    }
}
