import { Injectable } from '@angular/core'
import { App, IpcRenderer, Shell, Dialog, Clipboard, GlobalShortcut, Screen, AutoUpdater, TouchBar, BrowserWindow, Menu, MenuItem, PowerSaveBlocker } from 'electron'
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
    screen: Screen
    remote = remote
    process: any
    autoUpdater: AutoUpdater
    powerSaveBlocker: PowerSaveBlocker
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

        this.process = remote.getGlobal('process')
        this.app = remote.app
        this.screen = remote.screen
        this.dialog = remote.dialog
        this.globalShortcut = remote.globalShortcut
        this.autoUpdater = remote.autoUpdater
        this.powerSaveBlocker = remote.powerSaveBlocker
        this.TouchBar = remote.TouchBar
        this.BrowserWindow = remote.BrowserWindow
        this.Menu = remote.Menu
        this.MenuItem = remote.MenuItem
    }
}
