import { Injectable } from '@angular/core'
import axios from 'axios'

import { Logger, LogService, ConfigService, UpdaterService, PlatformService, TranslateService } from 'tabby-core'
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
        private translate: TranslateService,
        private platform: PlatformService,
        private electron: ElectronService,
    ) {
        super()
        this.logger = log.create('updater')

        if (process.platform === 'linux' || process.env.PORTABLE_EXECUTABLE_FILE) {
            this.electronUpdaterAvailable = false
            return
        }

        this.electron.ipcRenderer.on('updater:update-available', () => {
            this.logger.info('Update available')
        })

        this.electron.ipcRenderer.on('updater:update-not-available', () => {
            this.logger.info('No updates')
        })

        this.electron.ipcRenderer.on('updater:error', err => {
            this.logger.error(err)
            this.electronUpdaterAvailable = false
        })

        this.downloaded = new Promise<boolean>(resolve => {
            this.electron.ipcRenderer.once('updater:update-downloaded', () => resolve(true))
        })

        config.ready$.toPromise().then(() => {
            if (config.store.enableAutomaticUpdates && this.electronUpdaterAvailable && !process.env.TABBY_DEV) {
                this.logger.debug('Checking for updates')
                try {
                    this.electron.ipcRenderer.send('updater:check-for-updates')
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
                    this.electron.ipcRenderer.off('updater:error', onError)
                    this.electron.ipcRenderer.off('updater:update-not-available', onNoUpdate)
                    this.electron.ipcRenderer.off('updater:update-available', onUpdate)
                }
                this.electron.ipcRenderer.on('updater:error', onError)
                this.electron.ipcRenderer.on('updater:update-not-available', onNoUpdate)
                this.electron.ipcRenderer.on('updater:update-available', onUpdate)
                try {
                    this.electron.ipcRenderer.send('updater:check-for-updates')
                } catch (e) {
                    this.electronUpdaterAvailable = false
                    this.logger.info('Electron updater unavailable, falling back', e)
                }
            })

            this.electron.ipcRenderer.on('updater:update-available', () => {
                this.logger.info('Update available')
            })

            this.electron.ipcRenderer.once('updater:update-not-available', () => {
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
                    message: this.translate.instant('Installing the update will close all tabs and restart Tabby.'),
                    buttons: [
                        this.translate.instant('Update'),
                        this.translate.instant('Cancel'),
                    ],
                    defaultId: 0,
                    cancelId: 1,
                },
            )).response === 0) {
                await this.downloaded
                this.electron.ipcRenderer.send('updater:quit-and-install')
            }
        }
    }
}
