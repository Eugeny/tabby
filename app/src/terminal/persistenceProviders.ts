import * as fs from 'fs-promise'
const exec = require('child-process-promise').exec

import { SessionOptions, SessionPersistenceProvider } from './api'


export class NullPersistenceProvider extends SessionPersistenceProvider {
    async recoverSession (_recoveryId: any): Promise<SessionOptions> {
        return null
    }

    async createSession (_options: SessionOptions): Promise<SessionOptions> {
        return null
    }

    async terminateSession (_recoveryId: string): Promise<void> {
        return
    }
}


export class ScreenPersistenceProvider extends SessionPersistenceProvider {
    list(): Promise<any[]> {
        return exec('screen -list').then((result) => {
            return result.stdout.split('\n')
                .filter((line) => /\bterm-tab-/.exec(line))
                .map((line) => line.trim().split('.')[0])
        }).catch(() => {
            return []
        })
    }

    async recoverSession (recoveryId: any): Promise<SessionOptions> {
        // TODO check
        return {
            recoveryId,
            command: 'screen',
            args: ['-r', recoveryId],
        }
    }

    async createSession (options: SessionOptions): Promise<SessionOptions> {
        let configPath = '/tmp/.termScreenConfig'
        await fs.writeFile(configPath, `
            escape ^^^
            vbell off
            term xterm-color
            bindkey "^[OH" beginning-of-line
            bindkey "^[OF" end-of-line
            termcapinfo xterm* 'hs:ts=\\E]0;:fs=\\007:ds=\\E]0;\\007'
            defhstatus "^Et"
            hardstatus off
        `, 'utf-8')
        let recoveryId = `term-tab-${Date.now()}`
        options.args = ['-c', configPath, '-U', '-S', recoveryId, '--', options.command].concat(options.args || [])
        options.command = 'screen'
        options.recoveryId = recoveryId
        return options
    }

    async terminateSession (recoveryId: string): Promise<void> {
        await exec(`screen -S ${recoveryId} -X quit`)
    }
}
