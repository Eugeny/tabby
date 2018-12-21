import axios from 'axios'
import * as os from 'os'
import { Injectable } from '@angular/core'
import { Logger, LogService } from './log.service'
import { ElectronService } from './electron.service'

const UPDATES_URL = 'https://api.github.com/repos/eugeny/terminus/releases/latest'

@Injectable({ providedIn: 'root' })
export class UpdaterService {
    private logger: Logger
    private downloaded: Promise<boolean>
    private isSquirrel = true
    private updateURL: string

    constructor (
        log: LogService,
        private electron: ElectronService,
    ) {
        this.logger = log.create('updater')

        try {
            electron.autoUpdater.setFeedURL(`https://terminus-updates.herokuapp.com/update/${os.platform()}/${electron.app.getVersion()}`)
        } catch (e) {
            this.isSquirrel = false
            this.logger.info('Squirrel updater unavailable, falling back')
        }

        this.electron.autoUpdater.on('update-available', () => {
            this.logger.info('Update available')
        })
        this.electron.autoUpdater.once('update-not-available', () => {
            this.logger.info('No updates')
        })

        this.downloaded = new Promise<boolean>(resolve => {
            this.electron.autoUpdater.once('update-downloaded', () => resolve(true))
        })

        this.logger.debug('Checking for updates')

        if (this.isSquirrel) {
            try {
                this.electron.autoUpdater.checkForUpdates()
            } catch (e) {
                this.isSquirrel = false
                this.logger.info('Squirrel updater unavailable, falling back')
            }
        }
    }

    async check (): Promise<boolean> {
        if (!this.isSquirrel) {
            this.logger.debug('Checking for updates')
            let response = await axios.get(UPDATES_URL)
            let data = response.data
            let version = data.tag_name.substring(1)
            if (this.electron.app.getVersion() !== version) {
                this.logger.info('Update available')
                this.updateURL = data.html_url
                return true
            }
            this.logger.info('No updates')
            return false
        }
        return this.downloaded
    }

    async update () {
        if (!this.isSquirrel) {
            this.electron.shell.openExternal(this.updateURL)
        } else {
            await this.downloaded
            this.electron.autoUpdater.quitAndInstall()
        }
    }
}
