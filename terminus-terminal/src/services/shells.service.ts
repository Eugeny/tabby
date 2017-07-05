import * as path from 'path'
import { exec } from 'mz/child_process'
import * as fs from 'mz/fs'
import { Injectable } from '@angular/core'
import { ElectronService, HostAppService, Platform, Logger, LogService } from 'terminus-core'

@Injectable()
export class ShellsService {
    private logger: Logger

    constructor (
        log: LogService,
        private electron: ElectronService,
        private hostApp: HostAppService,
    ) {
        this.logger = log.create('shells')
    }

    getClinkOptions (): { command, args } {
        return {
            command: 'cmd.exe',
            args: [
                '/k',
                path.join(
                    path.dirname(this.electron.app.getPath('exe')),
                    'resources',
                    'clink',
                    `clink_${process.arch}.exe`,
                ),
                'inject',
            ]
        }
    }

    async getDefaultShell (): Promise<string> {
        if (this.hostApp.platform === Platform.macOS) {
            return this.getDefaultMacOSShell()
        } else {
            return this.getDefaultLinuxShell()
        }
    }

    async getDefaultMacOSShell (): Promise<string> {
        let shellEntry = (await exec(`dscl . -read /Users/${process.env.LOGNAME} UserShell`))[0].toString()
        return shellEntry.split(' ')[1].trim()
    }

    async getDefaultLinuxShell (): Promise<string> {
        let line = (await fs.readFile('/etc/passwd', { encoding: 'utf-8' }))
            .split('\n').find(x => x.startsWith(process.env.LOGNAME + ':'))
        if (!line) {
            this.logger.warn('Could not detect user shell')
            return '/bin/sh'
        } else {
            return line.split(':')[6]
        }
    }
}
