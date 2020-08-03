import axios from 'axios'

import { Injectable } from '@angular/core'
import { Logger, LogService } from './log.service'
import { ElectronService } from './electron.service'
import { ConfigService } from './config.service'

const UPDATES_URL = 'https://api.github.com/repos/eugeny/terminus/releases/latest'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class UpdaterService {
    private logger: Logger
    private downloaded: Promise<boolean>
    private electronUpdaterAvailable = true
    private updateURL: string

    private constructor (
        log: LogService,
        private electron: ElectronService,
        private config: ConfigService,
    ) {
        this.logger = log.create('updater')

        if (process.platform === 'linux') {
            this.electronUpdaterAvailable = false
            return
        }

        electron.autoUpdater.on('update-available', () => {
            this.logger.info('Update available')
        })

        electron.autoUpdater.once('update-not-available', () => {
            this.logger.info('No updates')
        })

        this.downloaded = new Promise<boolean>(resolve => {
            electron.autoUpdater.once('update-downloaded', () => resolve(true))
        })

        if (config.store.enableAutomaticUpdates && this.electronUpdaterAvailable && !process.env.TERMINUS_DEV) {
            this.logger.debug('Checking for updates')
            try {
                electron.autoUpdater.setFeedURL({
                    url: `https://update.electronjs.org/eugeny/terminus/${process.platform}-${process.arch}/${electron.app.getVersion()}`,
                })
                electron.autoUpdater.checkForUpdates()
            } catch (e) {
                this.electronUpdaterAvailable = false
                this.logger.info('Electron updater unavailable, falling back', e)
            }
        }
    }

    async check (): Promise<boolean> {
        if (!this.config.store.enableAutomaticUpdates) {
            return false
        }
        if (!this.electronUpdaterAvailable) {
            this.logger.debug('Checking for updates through fallback method.')
            const response = await axios.get(UPDATES_URL)
            const data = response.data
            const version = data.tag_name.substring(1)
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

    async update (): Promise<void> {
        if (!this.electronUpdaterAvailable) {
            this.electron.shell.openExternal(this.updateURL)
        } else {
            await this.downloaded
            this.electron.autoUpdater.quitAndInstall()
        }
    }
}
