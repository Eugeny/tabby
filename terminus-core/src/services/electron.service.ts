import { Injectable } from '@angular/core'

@Injectable()
export class ElectronService {
    app: any
    ipcRenderer: any
    shell: any
    dialog: any
    clipboard: any
    globalShortcut: any
    screen: any
    private electron: any
    private remoteElectron: any

    constructor () {
        this.electron = require('electron')
        this.remoteElectron = this.remoteRequire('electron')
        this.app = this.electron.remote.app
        this.screen = this.electron.remote.screen
        this.dialog = this.electron.remote.dialog
        this.shell = this.electron.shell
        this.clipboard = this.electron.clipboard
        this.ipcRenderer = this.electron.ipcRenderer
        this.globalShortcut = this.electron.remote.globalShortcut
    }

    remoteRequire (name: string): any {
        return this.electron.remote.require(name)
    }
}
