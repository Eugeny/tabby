import * as fs from 'fs-promise'
const { exec, spawn } = require('child-process-promise')

import { SessionOptions, SessionPersistenceProvider } from './api'


export class ScreenPersistenceProvider extends SessionPersistenceProvider {
    async attachSession (recoveryId: any): Promise<SessionOptions> {
        let lines: string[]
        try {
            lines = (await exec('screen -list')).stdout.split('\n')
        } catch (result) {
            lines = result.stdout.split('\n')
        }
        let screenPID = lines
            .filter(line => line.indexOf('.' + recoveryId) !== -1)
            .map(line => parseInt(line.trim().split('.')[0]))[0]

        if (!screenPID) {
            return null
        }

        lines = (await exec(`pgrep -P ${screenPID}`)).stdout.split('\n')
        let recoveredTruePID = parseInt(lines[0])

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
            vbell on
            term xterm-color
            bindkey "^[OH" beginning-of-line
            bindkey "^[OF" end-of-line
            bindkey "\\027[?1049h" stuff ----alternate enter-----
            bindkey "\\027[?1049l" stuff ----alternate leave-----
            termcapinfo xterm* 'hs:ts=\\E]0;:fs=\\007:ds=\\E]0;\\007'
            defhstatus "^Et"
            hardstatus off
            altscreen on
        `, 'utf-8')
        let recoveryId = `term-tab-${Date.now()}`
        let args = ['-d', '-m', '-c', configPath, '-U', '-S', recoveryId, '-T', 'xterm-256color', '--', options.command].concat(options.args || [])
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
