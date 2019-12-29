import { app, ipcMain, Menu, Tray, shell } from 'electron'
import * as electron from 'electron'
import { loadConfig } from './config'
import { Window, WindowOptions } from './window'

export class Application {
    private tray: Tray
    private windows: Window[] = []

    constructor () {
        ipcMain.on('app:config-change', () => {
            this.broadcast('host:config-change')
        })

        const configData = loadConfig()
        if (process.platform === 'linux') {
            app.commandLine.appendSwitch('no-sandbox')
            if (((configData.appearance || {}).opacity || 1) !== 1) {
                app.commandLine.appendSwitch('enable-transparent-visuals')
                app.disableHardwareAcceleration()
            }
        }

        app.commandLine.appendSwitch('disable-http-cache')
        app.commandLine.appendSwitch('lang', 'EN')

        for (const flag of configData.flags || [['force_discrete_gpu', '0']]) {
            app.commandLine.appendSwitch(flag[0], flag[1])
        }
    }

    init () {
        electron.screen.on('display-metrics-changed', () => this.broadcast('host:display-metrics-changed'))
    }

    async newWindow (options?: WindowOptions): Promise<Window> {
        let window = new Window(options)
        this.windows.push(window)
        window.visible$.subscribe(visible => {
            if (visible) {
                this.disableTray()
            } else {
                this.enableTray()
            }
        })
        if (process.platform === 'darwin') {
            this.setupMenu()
        }
        await window.ready
        return window
    }

    broadcast (event, ...args) {
        for (let window of this.windows) {
            window.send(event, ...args)
        }
    }

    async send (event, ...args) {
        if (!this.hasWindows()) {
            await this.newWindow()
        }
        this.windows.filter(w => !w.isDestroyed())[0].send(event, ...args)
    }

    enableTray () {
        if (this.tray) {
            return
        }
        if (process.platform === 'darwin') {
            this.tray = new Tray(`${app.getAppPath()}/assets/tray-darwinTemplate.png`)
            this.tray.setPressedImage(`${app.getAppPath()}/assets/tray-darwinHighlightTemplate.png`)
        } else {
            this.tray = new Tray(`${app.getAppPath()}/assets/tray.png`)
        }

        this.tray.on('click', () => setTimeout(() => this.focus()));

        const contextMenu = Menu.buildFromTemplate([{
            label: 'Show',
            click: () => this.focus(),
        }])

        if (process.platform !== 'darwin') {
            this.tray.setContextMenu(contextMenu)
        }

        this.tray.setToolTip(`Terminus ${app.getVersion()}`)
    }

    disableTray () {
        if (this.tray) {
            this.tray.destroy()
            this.tray = null
        }
    }

    hasWindows () {
        return !!this.windows.length
    }

    focus () {
        for (let window of this.windows) {
            window.show()
        }
    }

    private setupMenu () {
        let template: Electron.MenuItemConstructorOptions[] = [
            {
                label: 'Application',
                submenu: [
                    { role: 'about', label: 'About Terminus' },
                    { type: 'separator' },
                    {
                        label: 'Preferences',
                        accelerator: 'Cmd+,',
                        click: async () => {
                            if (!this.hasWindows()) {
                                await this.newWindow()
                            }
                            this.windows[0].send('host:preferences-menu')
                        },
                    },
                    { type: 'separator' },
                    { role: 'services', submenu: [] },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    {
                        label: 'Quit',
                        accelerator: 'Cmd+Q',
                        click () {
                            app.quit()
                        },
                    },
                ],
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                ],
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' },
                ],
            },
            {
                role: 'window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'zoom' },
                    { type: 'separator' },
                    { role: 'front' },
                ],
            },
            {
                role: 'help',
                submenu: [
                    {
                        label: 'Website',
                        click () {
                            shell.openExternal('https://eugeny.github.io/terminus')
                        },
                    },
                ],
            }
        ]

        Menu.setApplicationMenu(Menu.buildFromTemplate(template))
    }
}
