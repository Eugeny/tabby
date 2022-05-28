import 'v8-compile-cache'
import './portable'
import 'source-map-support/register'
import './sentry'
import './lru'
import { app, ipcMain, Menu, dialog } from 'electron'
import { parseArgs } from './cli'
import { Application } from './app'
import electronDebug = require('electron-debug')
import { loadConfig } from './config'

if (!process.env.TABBY_PLUGINS) {
    process.env.TABBY_PLUGINS = ''
}

const argv = parseArgs(process.argv, process.cwd())

loadConfig().then(configStore => {
    const application = new Application(configStore)

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

    process.on('uncaughtException' as any, err => {
        console.log(err)
        application.broadcast('uncaughtException', err)
    })

    app.on('second-instance', (_event, newArgv, cwd) => {
        application.handleSecondInstance(newArgv, cwd)
    })

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
}).catch(err => {
    dialog.showErrorBox('Could not read config', err.message)
})

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
