if (process.platform == 'win32' && require('electron-squirrel-startup')) process.exit(0)

const electron = require('electron')
if (process.argv.indexOf('--debug') !== -1) {
    require('electron-debug')({enabled: true, showDevTools: 'undocked'})
}


let app = electron.app

let secondInstance = app.makeSingleInstance((argv, cwd) => {
  app.window.webContents.send('host:second-instance', argv, cwd)
})

if (secondInstance) {
  app.quit()
  return
}


const yaml = require('js-yaml')
const path = require('path')
const fs = require('fs')
const Config = require('electron-config')
let windowConfig = new Config({name: 'window'})


if (!process.env.TERMINUS_PLUGINS) {
  process.env.TERMINUS_PLUGINS = ''
}

setupWindowManagement = () => {
    app.window.on('show', () => {
      app.window.webContents.send('host:window-shown')
    })

    app.window.on('close', (e) => {
        windowConfig.set('windowBoundaries', app.window.getBounds())
    })

    app.window.on('closed', () => {
        app.window = null
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
        app.window.setBounds(bounds)
    })

    electron.ipcMain.on('window-set-always-on-top', (event, flag) => {
        app.window.setAlwaysOnTop(flag)
    })
}


setupMenu = () => {
    let template = [{
        label: "Application",
        submenu: [
            { role: 'about', label: 'About Terminus' },
            { type: 'separator' },
            {
                label: 'Preferences',
                accelerator: 'Cmd+,',
                click () {
                    app.window.webContents.send('host:preferences-menu')
                }
            },
            { type: 'separator' },
            { role: 'services', submenu: [] },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideothers' },
            { role: 'unhide' },
            { type: 'separator' },
            {
                label: 'Quit',
                accelerator: 'Cmd+Q',
                click () {
                    app.quit()
                }
            }
        ]
    },
    {
        label: "Edit",
        submenu: [
            {role: 'undo'},
            {role: 'redo'},
            {type: 'separator'},
            {role: 'cut'},
            {role: 'copy'},
            {role: 'paste'},
            {role: 'pasteandmatchstyle'},
            {role: 'delete'},
            {role: 'selectall'}
        ]
    },
    {
        label: 'View',
        submenu: [
            {role: 'reload'},
            {role: 'forcereload'},
            {role: 'toggledevtools'},
            {type: 'separator'},
            {role: 'resetzoom'},
            {role: 'zoomin'},
            {role: 'zoomout'},
            {type: 'separator'},
            {role: 'togglefullscreen'}
        ]
    },
    {
        role: 'window',
        submenu: [
            {role: 'close'},
            {role: 'minimize'},
            {role: 'zoom'},
            {type: 'separator'},
            {role: 'front'}
        ]
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Website',
                click () { electron.shell.openExternal('https://eugeny.github.io/terminus') }
            }
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
        height: 600,
        title: 'Terminus',
        minWidth: 400,
        minHeight: 300,
        'web-preferences': {'web-security': false},
        //- background to avoid the flash of unstyled window
        backgroundColor: '#131d27',
        frame: false,
        //type: 'toolbar',
    }
    Object.assign(options, windowConfig.get('windowBoundaries'))

    if ((configData.appearance || {}).frame == 'native') {
        options.frame = true
    } else {
        if (process.platform == 'darwin') {
            options.titleBarStyle = 'hidden-inset'
        }
    }

    app.commandLine.appendSwitch('disable-http-cache')

    app.window = new electron.BrowserWindow(options)
    app.window.loadURL(`file://${app.getAppPath()}/dist/index.html`, {extraHeaders: "pragma: no-cache\n"})

    if (process.platform != 'darwin') {
        app.window.setMenu(null)
    }

    app.window.show()
    app.window.focus()

    setupWindowManagement()

    if (process.platform == 'darwin') {
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
