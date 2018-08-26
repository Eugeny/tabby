import * as path from 'path'
import { Observable, Subject } from 'rxjs'
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
    ready = new EventEmitter<any>()
    shown = new EventEmitter<any>()
    isFullScreen = false
    private preferencesMenu = new Subject<void>()
    private secondInstance = new Subject<void>()
    private cliOpenDirectory = new Subject<string>()
    private cliRunCommand = new Subject<string[]>()
    private logger: Logger

    get preferencesMenu$ (): Observable<void> { return this.preferencesMenu }
    get secondInstance$ (): Observable<void> { return this.secondInstance }
    get cliOpenDirectory$ (): Observable<string> { return this.cliOpenDirectory }
    get cliRunCommand$ (): Observable<string[]> { return this.cliRunCommand }

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

        electron.ipcRenderer.on('host:preferences-menu', () => this.zone.run(() => this.preferencesMenu.next()))

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

        electron.ipcRenderer.on('host:second-instance', ($event, argv: any, cwd: string) => this.zone.run(() => {
            this.logger.info('Second instance', argv)
            const op = argv._[0]
            if (op === 'open') {
                this.cliOpenDirectory.next(path.resolve(cwd, argv.directory))
            } else if (op === 'run') {
                this.cliRunCommand.next(argv.command)
            }
        }))

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
            this.getWindow().setVibrancy(enable ? 'dark' : null)
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
