import * as fs from 'mz/fs'
import { Injectable } from '@angular/core'
import { HostAppService, Platform, LogService, Logger } from 'terminus-core'

import { ShellProvider } from '../api/shellProvider'
import { Shell } from '../api/interfaces'

/** @hidden */
@Injectable()
export class LinuxDefaultShellProvider extends ShellProvider {
    private logger: Logger

    constructor (
        private hostApp: HostAppService,
        log: LogService,
    ) {
        super()
        this.logger = log.create('linuxDefaultShell')
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform !== Platform.Linux) {
            return []
        }
        const line = (await fs.readFile('/etc/passwd', { encoding: 'utf-8' }))
            .split('\n').find(x => x.startsWith(process.env.LOGNAME + ':'))
        if (!line) {
            this.logger.warn('Could not detect user shell')
            return [{
                id: 'default',
                name: 'User default',
                command: '/bin/sh',
                env: {},
            }]
        } else {
            return [{
                id: 'default',
                name: 'User default',
                command: line.split(':')[6],
                args: ['--login'],
                hidden: true,
                env: {},
            }]
        }
    }
}
