import { Injectable } from '@angular/core'
import { App, IpcRenderer, Shell, Dialog, Clipboard, GlobalShortcut, Screen, Remote, AutoUpdater, TouchBar, BrowserWindow, Menu, MenuItem, NativeImage, MessageBoxOptions } from 'electron'
import * as remote from '@electron/remote'

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
    process: any
    autoUpdater: AutoUpdater
    TouchBar: typeof TouchBar
    BrowserWindow: typeof BrowserWindow
    Menu: typeof Menu
    MenuItem: typeof MenuItem

    /** @hidden */
    private constructor () {
        const electron = require('electron')
        this.shell = electron.shell
        this.clipboard = electron.clipboard
        this.ipcRenderer = electron.ipcRenderer

        this.process = remote.process
        this.app = remote.app
        this.screen = remote.screen
        this.dialog = remote.dialog
        this.globalShortcut = remote.globalShortcut
        this.nativeImage = remote.nativeImage
        this.autoUpdater = remote.autoUpdater
        this.TouchBar = remote.TouchBar
        this.BrowserWindow = remote.BrowserWindow
        this.Menu = remote.Menu
        this.MenuItem = remote.MenuItem
    }

    async showMessageBox (
        browserWindow: BrowserWindow,
        options: MessageBoxOptions
    ): Promise<MessageBoxResponse> {
        return this.dialog.showMessageBox(browserWindow, options)
    }
}
