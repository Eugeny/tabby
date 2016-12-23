import { Injectable } from '@angular/core'


@Injectable()
export class ElectronService {
    constructor() {
        if (process.env.TEST_ENV) {
            this.initTest()
        } else {
            this.init()
        }
    }

    init() {
        this.electron = require('electron')
        this.remoteElectron = this.remoteRequire('electron')
        this.app = this.remoteElectron.app
        this.dialog = this.remoteElectron.dialog
        this.shell = this.electron.shell
        this.clipboard = this.electron.clipboard
        this.ipcRenderer = this.electron.ipcRenderer
    }

    initTest() {
        ;
    }

    remoteRequire(name: string): any {
        return this.electron.remote.require(name)
    }

    app: any
    ipcRenderer: any
    shell: any
    dialog: any
    clipboard: any
    private electron: any
    private remoteElectron: any
}
