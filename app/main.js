if (process.platform == 'win32' && require('electron-squirrel-startup')) process.exit(0)

const electron = require('electron')
let electronVibrancy
if (process.platform != 'linux') {
  electronVibrancy = require('electron-vibrancy')
}

let app = electron.app


const yaml = require('js-yaml')
const path = require('path')
const fs = require('fs')
const Config = require('electron-config')
let windowConfig = new Config({name: 'window'})


if (!process.env.TERMINUS_PLUGINS) {
  process.env.TERMINUS_PLUGINS = ''
}

setWindowVibrancy = (enabled) => {
  if (enabled && !app.window.vibrancyViewID) {
    app.window.vibrancyViewID = electronVibrancy.SetVibrancy(app.window, 0)
  } else if (!enabled && app.window.vibrancyViewID) {
    electronVibrancy.RemoveView(app.window, app.window.vibrancyViewID)
    app.window.vibrancyViewID = null
  }
}

setupWindowManagement = () => {
    app.window.on('show', () => {
      app.window.webContents.send('host:window-shown')
      if (app.tray) {
        app.tray.destroy()
        app.tray = null
      }
    })

    app.window.on('hide', (e) => {
      if (!app.tray) {
        setupTray()
      }
    })

    app.window.on('enter-full-screen', () => app.window.webContents.send('host:window-enter-full-screen'))
    app.window.on('leave-full-screen', () => app.window.webContents.send('host:window-leave-full-screen'))

    app.window.on('close', (e) => {
        windowConfig.set('windowBoundaries', app.window.getBounds())
    })

    app.window.on('closed', () => {
        app.window = null
    })

    electron.ipcMain.on('window-focus', () => {
        app.window.focus()
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

    electron.ipcMain.on('window-set-vibrancy', (event, enabled) => {
      setWindowVibrancy(enabled)
    })
}


setupTray = () => {
  if (process.platform == 'darwin') {
    app.tray = new electron.Tray(`${app.getAppPath()}/assets/tray-darwinTemplate.png`)
    app.tray.setPressedImage(`${app.getAppPath()}/assets/tray-darwinHighlightTemplate.png`)
  } else {
    app.tray = new electron.Tray(`${app.getAppPath()}/assets/tray.png`)
  }

  app.tray.on('click', () => {
    app.window.show()
    app.window.focus()
  })

  const contextMenu = electron.Menu.buildFromTemplate([{
    label: 'Show',
    click () {
      app.window.show()
      app.window.focus()
    }
  }])

  if (process.platform != 'darwin') {
    app.tray.setContextMenu(contextMenu)
  }

  app.tray.setToolTip(`Terminus ${app.getVersion()}`)
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
        webPreferences: {webSecurity: false},
        //- background to avoid the flash of unstyled window
        backgroundColor: '#131d27',
        frame: false,
        show: false,
    }
    Object.assign(options, windowConfig.get('windowBoundaries'))

    if ((configData.appearance || {}).frame == 'native') {
        options.frame = true
    } else {
        if (process.platform == 'darwin') {
            options.titleBarStyle = 'hiddenInset'
        }
    }

    if (['darwin', 'win32'].includes(process.platform)) {
      options.transparent = true
      delete options.backgroundColor
    }

    app.commandLine.appendSwitch('disable-http-cache')

    app.window = new electron.BrowserWindow(options)
    app.window.once('ready-to-show', () => {
      if (process.platform == 'darwin') {
        app.window.setVibrancy('dark')
      } else if (process.platform == 'windows') {
        setWindowVibrancy(true)
      }
      app.window.show()
      app.window.focus()
    })
    app.window.loadURL(`file://${app.getAppPath()}/dist/index.html`, {extraHeaders: "pragma: no-cache\n"})

    if (process.platform != 'darwin') {
        app.window.setMenu(null)
    }

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



const argv = require('yargs')
  .usage('terminus [command] [arguments]')
  .version('v', 'Show version and exit', app.getVersion())
  .alias('d', 'debug')
  .describe('d', 'Show DevTools on start')
  .alias('h', 'help')
  .help('h')
  .strict()
  .argv

app.on('second-instance', (argv, cwd) => {
  app.window.webContents.send('host:second-instance', argv, cwd)
})

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

if (argv.d) {
  require('electron-debug')({enabled: true, showDevTools: 'undocked'})
}

app.on('ready', start)
