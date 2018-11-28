import * as os from 'os'
import { Injectable } from '@angular/core'
import { Logger, LogService } from './log.service'
import { ElectronService } from './electron.service'

@Injectable()
export class UpdaterService {
    private logger: Logger
    private downloaded: Promise<void>

    constructor (
        log: LogService,
        private electron: ElectronService,
    ) {
        this.logger = log.create('updater')
        electron.autoUpdater.setFeedURL(`https://terminus-updates.herokuapp.com/update/${os.platform()}/${electron.app.getVersion()}`)

        this.electron.autoUpdater.on('update-available', () => {
            this.logger.info('Update available')
        })
        this.electron.autoUpdater.once('update-not-available', () => {
            this.logger.info('No updates')
        })

        this.downloaded = new Promise<void>(resolve => {
            this.electron.autoUpdater.once('update-downloaded', resolve)
        })

        this.logger.debug('Checking for updates')
        this.electron.autoUpdater.checkForUpdates()
    }

    check (): Promise<void> {
        return this.downloaded
    }

    async update () {
        await this.downloaded
        this.electron.autoUpdater.quitAndInstall()
    }
}
