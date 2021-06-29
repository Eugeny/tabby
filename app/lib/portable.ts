import * as path from 'path'
import * as fs from 'fs'
import * as electron from 'electron'

const appPath = path.dirname(electron.app.getPath('exe'))

const portableData = path.join(appPath, 'data')
if (fs.existsSync(portableData)) {
    console.log('reset user data to ' + portableData)
    electron.app.setPath('userData', portableData)
}
