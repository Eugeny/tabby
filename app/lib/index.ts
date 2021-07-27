import 'v8-compile-cache'
import './portable'
import 'source-map-support/register'
import './sentry'
import './lru'
import { app, ipcMain, Menu } from 'electron'
import { parseArgs } from './cli'
import { Application } from './app'
import electronDebug = require('electron-debug')

if (!process.env.TABBY_PLUGINS) {
    process.env.TABBY_PLUGINS = ''
}

const application = new Application()

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
    application.handleSecondInstance(argv, cwd)
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

app.on('ready', async () => {
    if (process.platform === 'darwin') {
        app.dock.setMenu(Menu.buildFromTemplate([
            {
                label: 'New window',
                click () {
                    this.app.newWindow()
                },
            },
        ]))
    }
    application.init()

    const window = await application.newWindow({ hidden: argv.hidden })
    await window.ready
    window.passCliArguments(process.argv, process.cwd(), false)
})
