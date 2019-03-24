import { Injectable } from '@angular/core'
import { TouchBar, BrowserWindow, Menu, MenuItem } from 'electron'

export interface MessageBoxResponse {
    response: number
    checkboxChecked?: boolean
}

@Injectable({ providedIn: 'root' })
export class ElectronService {
    app: any
    ipcRenderer: any
    shell: any
    dialog: any
    clipboard: any
    globalShortcut: any
    nativeImage: any
    screen: any
    remote: any
    autoUpdater: any
    TouchBar: typeof TouchBar
    BrowserWindow: typeof BrowserWindow
    Menu: typeof Menu
    MenuItem: typeof MenuItem
    private electron: any

    /** @hidden */
    constructor () {
        this.electron = require('electron')
        this.remote = this.electron.remote
        this.app = this.remote.app
        this.screen = this.remote.screen
        this.dialog = this.remote.dialog
        this.shell = this.electron.shell
        this.clipboard = this.electron.clipboard
        this.ipcRenderer = this.electron.ipcRenderer
        this.globalShortcut = this.remote.globalShortcut
        this.nativeImage = this.remote.nativeImage
        this.autoUpdater = this.remote.autoUpdater
        this.TouchBar = this.remote.TouchBar
        this.BrowserWindow = this.remote.BrowserWindow
        this.Menu = this.remote.Menu
        this.MenuItem = this.remote.MenuItem
    }

    /**
     * Removes OS focus from Terminus' window
     */
    loseFocus () {
        if (process.platform === 'darwin') {
            this.remote.Menu.sendActionToFirstResponder('hide:')
        }
    }

    showMessageBox (
        browserWindow: Electron.BrowserWindow,
        options: Electron.MessageBoxOptions
    ): Promise<MessageBoxResponse> {
        return new Promise(resolve => {
            this.dialog.showMessageBox(browserWindow, options, (response, checkboxChecked) => {
                resolve({ response, checkboxChecked })
            })
        })
    }
}
