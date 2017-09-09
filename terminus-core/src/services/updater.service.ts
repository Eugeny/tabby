import axios from 'axios'
import { Injectable } from '@angular/core'
import { Logger, LogService } from './log.service'
import { ElectronService } from './electron.service'

const UPDATES_URL = 'https://api.github.com/repos/eugeny/terminus/releases/latest'

export interface Update {
    version: string
    url: string
}

@Injectable()
export class UpdaterService {
    private logger: Logger

    constructor (
        log: LogService,
        private electron: ElectronService,
    ) {
        this.logger = log.create('updater')
    }

    async check (): Promise<Update> {
        this.logger.debug('Checking for updates')
        let response = await axios.get(UPDATES_URL)
        let data = response.data
        let version = data.tag_name.substring(1)
        if (this.electron.app.getVersion() !== version) {
            this.logger.info('Update available:', version)
            return { version, url: data.html_url }
        }
        this.logger.info('No updates')
        return null
    }
}
