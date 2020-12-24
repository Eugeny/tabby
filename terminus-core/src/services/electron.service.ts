import { Injectable } from '@angular/core'
import { App, IpcRenderer, Shell, Dialog, Clipboard, GlobalShortcut, Screen, Remote, AutoUpdater, TouchBar, BrowserWindow, Menu, MenuItem, NativeImage, MessageBoxOptions } from 'electron'

export interface MessageBoxResponse {
    response: number
    checkboxChecked?: boolean
}

@Injectable({ providedIn: 'root' })
export class ElectronService {
    app: App
    ipcRenderer: IpcRenderer
    shell: Shell
    dialog: Dialog
    clipboard: Clipboard
    globalShortcut: GlobalShortcut
    nativeImage: typeof NativeImage
    screen: Screen
    remote: Remote
    autoUpdater: AutoUpdater
    TouchBar: typeof TouchBar
    BrowserWindow: typeof BrowserWindow
    Menu: typeof Menu
    MenuItem: typeof MenuItem
    private electron: any

    /** @hidden */
    private constructor () {
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

    async showMessageBox (
        browserWindow: BrowserWindow,
        options: MessageBoxOptions
    ): Promise<MessageBoxResponse> {
        return this.dialog.showMessageBox(browserWindow, options)
    }
}
