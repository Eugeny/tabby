import * as path from 'path'
import * as fs from 'fs'

let appPath: string | null = null
try {
    appPath = path.dirname(require('electron').app.getPath('exe'))
} catch {
    appPath = path.dirname(require('electron').remote.app.getPath('exe'))
}

if (null != appPath) {
    if(fs.existsSync(path.join(appPath, 'terminus-data'))) {
        fs.renameSync(path.join(appPath, 'terminus-data'), path.join(appPath, 'data'))
    }
    const portableData = path.join(appPath, 'data')
    if (fs.existsSync(portableData)) {
        console.log('reset user data to ' + portableData)
        try {
            require('electron').app.setPath('userData', portableData)
        } catch {
            require('electron').remote.app.setPath('userData', portableData)
        }
    }
}
