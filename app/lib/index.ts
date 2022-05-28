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

const application = loadConfig().catch(err => {
    dialog.showErrorBox('Could not read config', err.message)
    app.exit(1)
}).then(configStore => {
    const _application = new Application(configStore)

    ipcMain.on('app:new-window', () => {
        _application.newWindow()
    })

    process.on('uncaughtException' as any, err => {
        console.log(err)
        _application.broadcast('uncaughtException', err)
    })

    if (argv.d) {
        electronDebug({
            isEnabled: true,
            showDevTools: true,
            devToolsMode: 'undocked',
        })
    }

    return _application
})


app.on('activate', async () => {
    if (!(await application).hasWindows()) {
        (await application).newWindow()
    } else {
        (await application).focus()
    }
})

app.on('second-instance', async (_event, newArgv, cwd) => {
    (await application).handleSecondInstance(newArgv, cwd)
})

if (!app.requestSingleInstanceLock()) {
    app.quit()
    app.exit(0)
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

    (await application).init()

    const window = await (await application).newWindow({ hidden: argv.hidden })
    await window.ready
    window.passCliArguments(process.argv, process.cwd(), false)
    window.focus()
})
