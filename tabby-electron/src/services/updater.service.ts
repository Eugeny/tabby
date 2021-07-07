import { Injectable } from '@angular/core'
import axios from 'axios'

import { Logger, LogService, ConfigService, UpdaterService, PlatformService } from 'tabby-core'
import { ElectronService } from '../services/electron.service'

const UPDATES_URL = 'https://api.github.com/repos/eugeny/tabby/releases/latest'

@Injectable()
export class ElectronUpdaterService extends UpdaterService {
    private logger: Logger
    private downloaded: Promise<boolean>
    private electronUpdaterAvailable = true
    private updateURL: string

    constructor (
        log: LogService,
        config: ConfigService,
        private platform: PlatformService,
        private electron: ElectronService,
    ) {
        super()
        this.logger = log.create('updater')

        if (process.platform === 'linux') {
            this.electronUpdaterAvailable = false
            return
        }

        electron.autoUpdater.on('update-available', () => {
            this.logger.info('Update available')
        })

        electron.autoUpdater.on('update-not-available', () => {
            this.logger.info('No updates')
        })

        electron.autoUpdater.on('error', err => {
            this.logger.error(err)
            this.electronUpdaterAvailable = false
        })

        this.downloaded = new Promise<boolean>(resolve => {
            electron.autoUpdater.once('update-downloaded', () => resolve(true))
        })


        config.ready$.toPromise().then(() => {
            if (config.store.enableAutomaticUpdates && this.electronUpdaterAvailable && !process.env.TABBY_DEV) {
                this.logger.debug('Checking for updates')
                try {
                    electron.autoUpdater.setFeedURL({
                        url: `https://update.electronjs.org/eugeny/tabby/${process.platform}-${process.arch}/${electron.app.getVersion()}`,
                    })
                    electron.autoUpdater.checkForUpdates()
                } catch (e) {
                    this.electronUpdaterAvailable = false
                    this.logger.info('Electron updater unavailable, falling back', e)
                }
            }
        })
    }

    async check (): Promise<boolean> {
        if (this.electronUpdaterAvailable) {
            return new Promise((resolve, reject) => {
                // eslint-disable-next-line @typescript-eslint/init-declarations, prefer-const
                let cancel
                const onNoUpdate = () => {
                    cancel()
                    resolve(false)
                }
                const onUpdate = () => {
                    cancel()
                    resolve(this.downloaded)
                }
                const onError = (err) => {
                    cancel()
                    reject(err)
                }
                cancel = () => {
                    this.electron.autoUpdater.off('error', onError)
                    this.electron.autoUpdater.off('update-not-available', onNoUpdate)
                    this.electron.autoUpdater.off('update-available', onUpdate)
                }
                this.electron.autoUpdater.on('error', onError)
                this.electron.autoUpdater.on('update-not-available', onNoUpdate)
                this.electron.autoUpdater.on('update-available', onUpdate)
                try {
                    this.electron.autoUpdater.checkForUpdates()
                } catch (e) {
                    this.electronUpdaterAvailable = false
                    this.logger.info('Electron updater unavailable, falling back', e)
                }
            })

            this.electron.autoUpdater.on('update-available', () => {
                this.logger.info('Update available')
            })

            this.electron.autoUpdater.once('update-not-available', () => {
                this.logger.info('No updates')
            })

        } else {
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
            await this.electron.shell.openExternal(this.updateURL)
        } else {
            if ((await this.platform.showMessageBox(
                {
                    type: 'warning',
                    message: 'Installing the update will close all tabs and restart Tabby.',
                    buttons: ['Cancel', 'Update'],
                    defaultId: 1,
                }
            )).response === 1) {
                await this.downloaded
                this.electron.autoUpdater.quitAndInstall()
            }
        }
    }
}
