import './lru'
import { app, ipcMain, Menu } from 'electron'
import electronDebug = require('electron-debug')
import { parseArgs } from './cli'
import { Application } from './app'
if (process.platform === 'win32' && require('electron-squirrel-startup')) process.exit(0)

if (!process.env.TERMINUS_PLUGINS) {
    process.env.TERMINUS_PLUGINS = ''
}

const application = new Application()

ipcMain.on('app:new-window', () => {
    console.log('new-window')
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
    process.exit(0)
}

if (argv.d) {
    electronDebug({ enabled: true, showDevTools: 'undocked' })
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
    application.newWindow({ hidden: argv.hidden })
})
