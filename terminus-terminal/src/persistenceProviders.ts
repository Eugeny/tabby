import * as fs from 'mz/fs'
import { exec, spawn } from 'mz/child_process'
import { exec as execCallback } from 'child_process'

import { AsyncSubject } from 'rxjs'
import { Injectable } from '@angular/core'
import { Logger, LogService } from 'terminus-core'
import { SessionOptions, SessionPersistenceProvider } from './api'

declare function delay (ms: number): Promise<void>

interface IChildProcess {
    pid: number
    ppid: number
    command: string
}

async function listProcesses (): Promise<IChildProcess[]> {
    return (await exec(`ps -A -o pid,ppid,command`))[0].toString()
        .split('\n')
        .slice(1)
        .map(line => line.split(' ').filter(x => x).slice(0, 3))
        .map(([pid, ppid, command]) => {
            return {
                pid: parseInt(pid), ppid: parseInt(ppid), command
            }
        })
}

@Injectable()
export class ScreenPersistenceProvider extends SessionPersistenceProvider {
    private logger: Logger

    constructor (
        log: LogService,
    ) {
        super()
        this.logger = log.create('main')
    }

    async attachSession (recoveryId: any): Promise<SessionOptions> {
        let lines = await new Promise<string[]>(resolve => {
            execCallback('screen -list', (_err, stdout) => {
                // returns an error code on macOS
                resolve(stdout.split('\n'))
            })
        })
        let screenPID = lines
            .filter(line => line.indexOf('.' + recoveryId) !== -1)
            .map(line => parseInt(line.trim().split('.')[0]))[0]

        if (!screenPID) {
            return null
        }

        let truePID$ = new AsyncSubject<number>()

        this.extractShellPID(screenPID).then(pid => {
            truePID$.next(pid)
            truePID$.complete()
        })

        return {
            recoveryId,
            recoveredTruePID$: truePID$.asObservable(),
            command: 'screen',
            args: ['-r', recoveryId],
        }
    }

    async extractShellPID (screenPID: number): Promise<number> {
        let child = (await listProcesses()).find(x => x.ppid === screenPID)

        if (!child) {
            throw new Error(`Could not find any children of the screen process (PID ${screenPID})!`)
        }

        if (child.command === 'login') {
            await delay(1000)
            child = (await listProcesses()).find(x => x.ppid === child.pid)
        }

        return child.pid
    }

    async startSession (options: SessionOptions): Promise<any> {
        let configPath = '/tmp/.termScreenConfig'
        await fs.writeFile(configPath, `
            escape ^^^
            vbell on
            deflogin off
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
        let args = ['-d', '-m', '-c', configPath, '-U', '-S', recoveryId, '-T', 'xterm-256color', '--', '-' + options.command].concat(options.args || [])
        this.logger.debug('Spawning screen with', args.join(' '))
        await spawn('screen', args, {
            cwd: options.cwd,
            env: options.env || process.env,
        })
        return recoveryId
    }

    async terminateSession (recoveryId: string): Promise<void> {
        try {
            await exec(`screen -S ${recoveryId} -X quit`)
        } catch (_) {
            // screen has already quit
        }
    }
}
