import axios from 'axios'
import * as os from 'os'

import { Injectable } from '@angular/core'
import { Logger, LogService } from './log.service'
import { ElectronService } from './electron.service'

const UPDATES_URL = 'https://api.github.com/repos/eugeny/terminus/releases/latest'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class UpdaterService {
    private logger: Logger
    private downloaded: Promise<boolean>
    private electronUpdaterAvailable = true
    private updateURL: string

    constructor (
        log: LogService,
        private electron: ElectronService,
    ) {
        this.logger = log.create('updater')

        const autoUpdater = electron.remote.require('electron-updater').autoUpdater

        autoUpdater.on('update-available', () => {
            this.logger.info('Update available')
        })
        autoUpdater.once('update-not-available', () => {
            this.logger.info('No updates')
        })

        this.downloaded = new Promise<boolean>(resolve => {
            autoUpdater.once('update-downloaded', () => resolve(true))
        })

        this.logger.debug('Checking for updates')

        if (this.electronUpdaterAvailable) {
            try {
                autoUpdater.checkForUpdates()
            } catch (e) {
                this.electronUpdaterAvailable = false
                this.logger.info('Electron updater unavailable, falling back', e)
            }
        }
    }

    async check (): Promise<boolean> {
        if (!this.electronUpdaterAvailable) {
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
        if (!this.electronUpdaterAvailable) {
            this.electron.shell.openExternal(this.updateURL)
        } else {
            await this.downloaded
            autoUpdater.quitAndInstall()
        }
    }
}
