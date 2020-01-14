import './sentry'
import './lru'
import { app, ipcMain, Menu } from 'electron'
import { parseArgs } from './cli'
import { Application } from './app'
import electronDebug = require('electron-debug')
import * as path from 'path'
import * as fs from 'fs'

if (!process.env.TERMINUS_PLUGINS) {
    process.env.TERMINUS_PLUGINS = ''
}

const application = new Application()

const portableData = path.join(`${process.env.PORTABLE_EXECUTABLE_DIR}`, 'data')
if (('PORTABLE_EXECUTABLE_DIR' in process.env) && fs.existsSync(portableData)) {
    fs.stat(portableData, (err, stats) => {
        if (stats.isDirectory()) {
            app.setPath('userData' ,portableData)
        } else {
            console.warn(err)
        }
    })
}

ipcMain.on('app:new-window', () => {
    application.newWindow()
})

app.on('activate', () => {
    if (!application.hasWindows()) {
        application.newWindow()
    } else {
        application.focus()
    }
})

app.on('window-all-closed', () => {
    app.quit()
})

process.on('uncaughtException' as any, err => {
    console.log(err)
    application.broadcast('uncaughtException', err)
})

app.on('second-instance', (_event, argv, cwd) => {
    application.send('host:second-instance', parseArgs(argv, cwd), cwd)
})

const argv = parseArgs(process.argv, process.cwd())

if (!app.requestSingleInstanceLock()) {
    app.quit()
    app.exit(0)
}

if (argv.d) {
    electronDebug({
        isEnabled: true,
        showDevTools: true,
        devToolsMode: 'undocked',
    })
}

app.on('ready', () => {
    if (process.platform === 'darwin') {
        app.dock.setMenu(Menu.buildFromTemplate([
            {
                label: 'New window',
                click () {
                    this.app.newWindow()
                }
            }
        ]))
    }
    application.init()
    application.newWindow({ hidden: argv.hidden })
})
