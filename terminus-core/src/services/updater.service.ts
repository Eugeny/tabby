import axios from 'axios'
import * as fs from 'fs'
import os from 'os'

import { spawn } from 'mz/child_process'

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
    private autoUpdater

    constructor (
        log: LogService,
        private electron: ElectronService,
        config: ConfigService,
    ) {
        this.logger = log.create('updater')

        this.autoUpdater = electron.remote.require('electron-updater').autoUpdater

        this.autoUpdater.autoInstallOnAppQuit = !!config.store.enableAutomaticUpdates

        this.autoUpdater.on('update-available', () => {
            this.logger.info('Update available')
        })
        this.autoUpdater.once('update-not-available', () => {
            this.logger.info('No updates')
        })

        this.downloaded = new Promise<boolean>(resolve => {
            this.autoUpdater.once('update-downloaded', () => resolve(true))
        })

        this.logger.debug('Checking for updates')

        if (this.electronUpdaterAvailable && !process.env.TERMINUS_DEV) {
            try {
                this.autoUpdater.checkForUpdates()
            } catch (e) {
                this.electronUpdaterAvailable = false
                this.logger.info('Electron updater unavailable, falling back', e)
            }
        }
    }

    async check (): Promise<boolean> {
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

    async update () {
        if (!this.electronUpdaterAvailable) {
            this.electron.shell.openExternal(this.updateURL)
        } else {
            if (process.platform === 'win32') {
                let downloadpath = await this.autoUpdater.downloadUpdate()
                fs.exists(downloadpath[0], (exists) => {
                    if (exists) {
                        fs.copyFile(downloadpath[0], os.tmpdir() + 'terminus-installer-temp.exe', (err) => {
                            if (!err) {
                                spawn(os.tmpdir() + 'terminus-installer-temp.exe', ['--force-run'], { detached: true, stdio: 'ignore' })
                            }
                        })
                    }
                })
            } else {
                await this.downloaded
                this.autoUpdater.quitAndInstall(false, true)
            }
        }
    }
}
