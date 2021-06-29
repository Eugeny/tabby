import { promises as fs } from 'fs'
import { Injectable } from '@angular/core'
import { FileProvider } from 'tabby-core'
import { ElectronService } from '../services/electron.service'
import { ElectronHostWindow } from './hostWindow.service'

@Injectable()
export class ElectronFileProvider extends FileProvider {
    name = 'Filesystem'

    constructor (
        private electron: ElectronService,
        private hostWindow: ElectronHostWindow,
    ) {
        super()
    }

    async selectAndStoreFile (description: string): Promise<string> {
        const result = await this.electron.dialog.showOpenDialog(
            this.hostWindow.getWindow(),
            {
                buttonLabel: `Select ${description}`,
                properties: ['openFile', 'treatPackageAsDirectory'],
            },
        )
        if (result.canceled || !result.filePaths.length) {
            throw new Error('canceled')
        }

        return `file://${result.filePaths[0]}`
    }

    async retrieveFile (key: string): Promise<Buffer> {
        if (key.startsWith('file://')) {
            key = key.substring('file://'.length)
        } else if (key.includes('://')) {
            throw new Error('Incorrect type')
        }
        return fs.readFile(key, { encoding: null })
    }
}
