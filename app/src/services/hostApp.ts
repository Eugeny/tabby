import { Injectable, NgZone, EventEmitter } from '@angular/core'
import { ElectronService } from 'services/electron'
import { Logger, LogService } from 'services/log'

export const PLATFORM_WINDOWS = 'win32'
export const PLATFORM_MAC = 'darwin'
export const PLATFORM_LINUX = 'linux'


@Injectable()
export class HostAppService {
    constructor(
        private zone: NgZone,
        private electron: ElectronService,
        log: LogService,
    ) {
        this.platform = require('os').platform()
        this.logger = log.create('hostApp')

        electron.ipcRenderer.on('host:quit-request', () => this.zone.run(() => this.quitRequested.emit()))

        electron.ipcRenderer.on('uncaughtException', function(err) {
            console.error('Unhandled exception:', err)
        })

        this.ready.subscribe(() => {
            electron.ipcRenderer.send('app:ready')
        })
    }

    platform: string;
    quitRequested = new EventEmitter<any>()
    ready = new EventEmitter<any>()

    private logger: Logger;

    getWindow() {
        return this.electron.app.window
    }

    getShell() {
        return this.electron.shell
    }

    getAppPath() {
        return this.electron.app.getAppPath()
    }

    getPath(type: string) {
        return this.electron.app.getPath(type)
    }

    openDevTools() {
        this.electron.app.webContents.openDevTools()
    }

    setWindowCloseable(flag: boolean) {
        this.electron.ipcRenderer.send('window-closeable', flag)
    }

    focusWindow() {
        this.electron.ipcRenderer.send('window-focus')
    }

    quit() {
        this.logger.info('Quitting')
        this.electron.app.quit()
    }
}
