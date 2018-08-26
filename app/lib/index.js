import { app, ipcMain, BrowserWindow, Menu, Tray, shell } from 'electron'
import * as path from 'path'
import electronDebug from 'electron-debug'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import './lru'
import { parseArgs } from './cli'
import ElectronConfig from 'electron-config'
if (process.platform === 'win32' && require('electron-squirrel-startup')) process.exit(0)

let electronVibrancy
if (process.platform !== 'linux') {
  electronVibrancy = require('electron-vibrancy')
}

let windowConfig = new ElectronConfig({ name: 'window' })

if (!process.env.TERMINUS_PLUGINS) {
  process.env.TERMINUS_PLUGINS = ''
}

const setWindowVibrancy = (enabled) => {
  if (enabled && !app.window.vibrancyViewID) {
    app.window.vibrancyViewID = electronVibrancy.SetVibrancy(app.window, 0)
  } else if (!enabled && app.window.vibrancyViewID) {
    electronVibrancy.RemoveView(app.window, app.window.vibrancyViewID)
    app.window.vibrancyViewID = null
  }
}

const setupTray = () => {
  if (process.platform === 'darwin') {
    app.tray = new Tray(`${app.getAppPath()}/assets/tray-darwinTemplate.png`)
    app.tray.setPressedImage(`${app.getAppPath()}/assets/tray-darwinHighlightTemplate.png`)
  } else {
    app.tray = new Tray(`${app.getAppPath()}/assets/tray.png`)
  }

  app.tray.on('click', () => {
    app.window.show()
    app.window.focus()
  })

  const contextMenu = Menu.buildFromTemplate([{
    label: 'Show',
    click () {
      app.window.show()
      app.window.focus()
    },
  }])

  if (process.platform !== 'darwin') {
    app.tray.setContextMenu(contextMenu)
  }

  app.tray.setToolTip(`Terminus ${app.getVersion()}`)
}

const setupWindowManagement = () => {
  app.window.on('show', () => {
    app.window.webContents.send('host:window-shown')
    if (app.tray) {
      app.tray.destroy()
      app.tray = null
    }
  })

  app.window.on('hide', () => {
    if (!app.tray) {
      setupTray()
    }
  })

  app.window.on('enter-full-screen', () => app.window.webContents.send('host:window-enter-full-screen'))
  app.window.on('leave-full-screen', () => app.window.webContents.send('host:window-leave-full-screen'))

  app.window.on('close', () => {
    windowConfig.set('windowBoundaries', app.window.getBounds())
  })

  app.window.on('closed', () => {
    app.window = null
  })

  ipcMain.on('window-focus', () => {
    app.window.focus()
  })

  ipcMain.on('window-maximize', () => {
    app.window.maximize()
  })

  ipcMain.on('window-unmaximize', () => {
    app.window.unmaximize()
  })

  ipcMain.on('window-toggle-maximize', () => {
    if (app.window.isMaximized()) {
      app.window.unmaximize()
    } else {
      app.window.maximize()
    }
  })

  ipcMain.on('window-minimize', () => {
    app.window.minimize()
  })

  ipcMain.on('window-set-bounds', (event, bounds) => {
    app.window.setBounds(bounds)
  })

  ipcMain.on('window-set-always-on-top', (event, flag) => {
    app.window.setAlwaysOnTop(flag)
  })

  ipcMain.on('window-set-vibrancy', (event, enabled) => {
    setWindowVibrancy(enabled)
  })
}

const setupMenu = () => {
  let template = [{
    label: 'Application',
    submenu: [
      { role: 'about', label: 'About Terminus' },
      { type: 'separator' },
      {
        label: 'Preferences',
        accelerator: 'Cmd+,',
        click () {
          app.window.webContents.send('host:preferences-menu')
        },
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
      { role: 'pasteandmatchstyle' },
      { role: 'delete' },
      { role: 'selectall' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
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
  }]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

const start = () => {
  let t0 = Date.now()

  let configPath = path.join(app.getPath('userData'), 'config.yaml')
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
    webPreferences: { webSecurity: false },
    frame: false,
    show: false,
  }
  Object.assign(options, windowConfig.get('windowBoundaries'))

  if ((configData.appearance || {}).frame === 'native') {
    options.frame = true
  } else {
    if (process.platform === 'darwin') {
      options.titleBarStyle = 'hiddenInset'
    }
  }

  if (process.platform === 'win32' && (configData.appearance || {}).vibrancy) {
    options.transparent = true
  }

  if (process.platform === 'linux') {
    options.backgroundColor = '#131d27'
  }

  app.commandLine.appendSwitch('disable-http-cache')

  app.window = new BrowserWindow(options)
  app.window.once('ready-to-show', () => {
    if (process.platform === 'darwin') {
      app.window.setVibrancy('dark')
    } else if (process.platform === 'win32' && (configData.appearance || {}).vibrancy) {
      setWindowVibrancy(true)
    }
    app.window.show()
    app.window.focus()
  })
  app.window.loadURL(`file://${app.getAppPath()}/dist/index.html`, { extraHeaders: 'pragma: no-cache\n' })

  if (process.platform !== 'darwin') {
    app.window.setMenu(null)
  }

  setupWindowManagement()

  if (process.platform === 'darwin') {
    setupMenu()
  } else {
    app.window.setMenu(null)
  }

  console.info(`Host startup: ${Date.now() - t0}ms`)
  t0 = Date.now()
  ipcMain.on('app:ready', () => {
    console.info(`App startup: ${Date.now() - t0}ms`)
  })
}

app.on('activate', () => {
  if (!app.window) {
    start()
  } else {
    app.window.show()
    app.window.focus()
  }
})

process.on('uncaughtException', function (err) {
  console.log(err)
  app.window.webContents.send('uncaughtException', err)
})

app.on('second-instance', (event, argv, cwd) => {
  app.window.webContents.send('host:second-instance', parseArgs(argv, cwd))
})

const argv = parseArgs(process.argv, process.cwd())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

if (argv.d) {
  electronDebug({ enabled: true, showDevTools: 'undocked' })
}

app.on('ready', start)
