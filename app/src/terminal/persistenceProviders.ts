import * as fs from 'fs-promise'
const exec = require('child-process-promise').exec
const spawn = require('child-process-promise').spawn

import { SessionOptions, SessionPersistenceProvider } from './api'


export class ScreenPersistenceProvider extends SessionPersistenceProvider {
    /*
    list(): Promise<any[]> {
        return exec('screen -list').then((result) => {
            return result.stdout.split('\n')
                .filter((line) => /\bterm-tab-/.exec(line))
                .map((line) => line.trim().split('.')[0])
        }).catch(() => {
            return []
        })
    }
    */

    async attachSession (recoveryId: any): Promise<SessionOptions> {
        let lines = (await exec('screen -list')).stdout.split('\n')
        let screenPID = lines
            .filter(line => line.indexOf('.' + recoveryId) !== -1)
            .map(line => parseInt(line.trim().split('.')[0]))[0]

        if (!screenPID) {
            return null
        }

        lines = (await exec(`ps -o pid --ppid ${screenPID}`)).stdout.split('\n')
        let recoveredTruePID = parseInt(lines[1].split(/\s/).filter(x => !!x)[0])

        return {
            recoveryId,
            recoveredTruePID,
            command: 'screen',
            args: ['-r', recoveryId],
        }
    }

    async startSession (options: SessionOptions): Promise<any> {
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
        let args = ['-d', '-m', '-c', configPath, '-U', '-S', recoveryId, '--', options.command].concat(options.args || [])
        await spawn('screen', args, {
            cwd: options.cwd,
            env: options.env || process.env,
        })
        return recoveryId
    }

    async terminateSession (recoveryId: string): Promise<void> {
        await exec(`screen -S ${recoveryId} -X quit`)
    }
}
