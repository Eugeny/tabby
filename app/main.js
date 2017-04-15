const electron = require('electron')

let app = electron.app

let secondInstance = app.makeSingleInstance((argv) => {
  app.window.webContents.send('host:second-instance')
})

if (secondInstance) {
  app.quit()
  return
}


const yaml = require('js-yaml')
const path = require('path')
const fs = require('fs')
const Config = require('electron-config')
const platform = require('os').platform()
require('electron-debug')({enabled: true, showDevTools: process.argv.indexOf('--debug') != -1})
let windowConfig = new Config({name: 'window'})


setupWindowManagement = () => {
    let windowCloseable

    app.window.on('show', () => {
      app.window.focus()
      app.window.webContents.send('host:window-shown')
    })

    app.window.on('close', (e) => {
        windowConfig.set('windowBoundaries', app.window.getBounds())
        if (!windowCloseable) {
            app.window.minimize()
            e.preventDefault()
        }
    })

    app.window.on('closed', () => {
        app.window = null
    })

    electron.ipcMain.on('window-closeable', (event, flag) => {
        windowCloseable = flag
    })

    electron.ipcMain.on('window-focus', () => {
        app.window.focus()
    })

    electron.ipcMain.on('window-toggle-focus', () => {
        if (app.window.isFocused()) {
            app.window.minimize()
        } else {
            app.window.focus()
        }
    })

    electron.ipcMain.on('window-maximize', () => {
        app.window.maximize()
    })

    electron.ipcMain.on('window-unmaximize', () => {
        app.window.unmaximize()
    })

    electron.ipcMain.on('window-toggle-maximize', () => {
        if (app.window.isMaximized()) {
            app.window.unmaximize()
        } else {
            app.window.maximize()
        }
    })

    electron.ipcMain.on('window-minimize', () => {
        app.window.minimize()
    })

    electron.ipcMain.on('window-set-bounds', (event, bounds) => {
        app.window.setBounds(bounds, true)
    })

    electron.ipcMain.on('window-set-always-on-top', (event, flag) => {
        app.window.setAlwaysOnTop(flag)
    })

    app.on('before-quit', () => windowCloseable = true)
}


setupMenu = () => {
    var template = [{
        label: "Application",
        submenu: [
            { type: "separator" },
            { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => {
                app.window.webContents.send('host:quit-request')
            }}
        ]
      },
      {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
        ]
    }]

    electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(template))
}


start = () => {
    let t0 = Date.now()

    let configPath = path.join(electron.app.getPath('userData'), 'config.yaml')
    let configData
    if (fs.existsSync(configPath)) {
        configData = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))
    } else {
        configData = {}
    }

    let options = {
        width: 800,
        height: 400,
        //icon: `${app.getAppPath()}/assets/img/icon.png`,
        title: 'Terminus',
        minWidth: 300,
        minHeight: 100,
        'web-preferences': {'web-security': false},
        //- background to avoid the flash of unstyled window
        backgroundColor: '#1D272D',
        frame: false,
        //type: 'toolbar',
    }
    Object.assign(options, windowConfig.get('windowBoundaries'))

    if (platform == 'darwin') {
        options.titleBarStyle = 'hidden-inset'
    }

    if ((configData.appearance || {}).useNativeFrame) {
        options.frame = true
    }

    app.commandLine.appendSwitch('disable-http-cache')

    app.window = new electron.BrowserWindow(options)
    app.window.loadURL(`file://${app.getAppPath()}/assets/webpack/index.html`, {extraHeaders: "pragma: no-cache\n"})

    if (platform != 'darwin') {
        app.window.setMenu(null)
    }

    app.window.show()
    app.window.focus()

    setupWindowManagement()

    if (platform == 'darwin') {
      setupMenu()
    } else {
      app.window.setMenu(null)
    }

    console.info(`Host startup: ${Date.now() - t0}ms`)
    t0 = Date.now()
    electron.ipcMain.on('app:ready', () => {
        console.info(`App startup: ${Date.now() - t0}ms`)
    })
}

app.on('ready', start)

app.on('activate', () => {
    if (!app.window)
        start()
    else {
        app.window.show()
        app.window.focus()
    }
})

process.on('uncaughtException', function(err) {
    console.log(err)
    app.window.webContents.send('uncaughtException', err)
})
