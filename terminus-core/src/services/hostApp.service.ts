import { Subject } from 'rxjs'
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
    preferencesMenu$ = new Subject<void>()
    ready = new EventEmitter<any>()
    shown = new EventEmitter<any>()
    secondInstance$ = new Subject<{ argv: string[], cwd: string }>()
    isFullScreen = false
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

        electron.ipcRenderer.on('host:preferences-menu', () => this.zone.run(() => this.preferencesMenu$.next()))

        electron.ipcRenderer.on('uncaughtException', ($event, err) => {
            this.logger.error('Unhandled exception:', err)
        })

        electron.ipcRenderer.on('host:window-enter-full-screen', () => this.zone.run(() => {
            this.isFullScreen = true
        }))

        electron.ipcRenderer.on('host:window-leave-full-screen', () => this.zone.run(() => {
            this.isFullScreen = false
        }))

        electron.ipcRenderer.on('host:window-shown', () => {
            this.zone.run(() => this.shown.emit())
        })

        electron.ipcRenderer.on('host:second-instance', ($event, argv: string[], cwd: string) => {
            this.zone.run(() => this.secondInstance$.next({ argv, cwd }))
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

    toggleFullscreen () {
        let window = this.getWindow()
        window.setFullScreen(!window.isFullScreen())
    }

    openDevTools () {
        this.getWindow().webContents.openDevTools({ mode: 'undocked' })
    }

    focusWindow () {
        this.electron.ipcRenderer.send('window-focus')
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

    setVibrancy (enable: boolean) {
      document.body.classList.toggle('vibrant', enable)
      if (this.platform === Platform.macOS) {
        this.hostApp.getWindow().setVibrancy(enable ? 'dark' : null)
      }
      if (this.platform === Platform.Windows) {
        this.electron.ipcRenderer.send('window-set-vibrancy', enable)
      }
    }

    quit () {
        this.logger.info('Quitting')
        this.electron.app.quit()
    }
}
