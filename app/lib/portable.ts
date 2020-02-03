import * as path from 'path'
import * as fs from 'fs'

if (process.env.PORTABLE_EXECUTABLE_DIR) {
    const portableData = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'terminus-data')
    if (!fs.existsSync(portableData)) {
        fs.mkdirSync(portableData)
    }

    try {
        require('electron').app.setPath('userData', portableData)
    } catch {
        require('electron').remote.app.setPath('userData', portableData)
    }
}
