import * as fs from 'mz/fs'
import * as path from 'path'
import { exec, spawn } from 'mz/child_process'
import { exec as execAsync, execFileSync } from 'child_process'

import { AsyncSubject } from 'rxjs'
import { Injectable } from '@angular/core'
import { Logger, LogService, ElectronService } from 'terminus-core'
import { SessionOptions, SessionPersistenceProvider } from '../api'

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
    id = 'screen'
    displayName = 'GNU Screen'
    private logger: Logger

    constructor (
        log: LogService,
        private electron: ElectronService,
    ) {
        super()
        this.logger = log.create('main')
    }

    isAvailable () {
        try {
            execFileSync('sh', ['-c', 'which screen'])
            return true
        } catch (_) {
            return false
        }
    }

    async attachSession (recoveryId: any): Promise<SessionOptions> {
        let lines = await new Promise<string[]>(resolve => {
            execAsync('screen -list', (_err, stdout) => {
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
            args: ['-d', '-r', recoveryId, '-c', await this.prepareConfig()],
        }
    }

    async extractShellPID (screenPID: number): Promise<number> {
        let processes = await listProcesses()
        let child = processes.find(x => x.ppid === screenPID)

        if (!child) {
            throw new Error(`Could not find any children of the screen process (PID ${screenPID})!`)
        }

        if (child.command === 'login') {
            await delay(1000)
            child = processes.find(x => x.ppid === child.pid)
        }

        return child.pid
    }

    async startSession (options: SessionOptions): Promise<any> {
        let recoveryId = `term-tab-${Date.now()}`
        let args = ['-d', '-m', '-c', await this.prepareConfig(), '-U', '-S', recoveryId, '-T', 'xterm-256color', '--', '-' + options.command].concat(options.args || [])
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

    private async prepareConfig (): Promise<string> {
        let configPath = path.join(this.electron.app.getPath('userData'), 'screen-config.tmp')
        await fs.writeFile(configPath, `
            escape ^^^
            vbell off
            deflogin on
            defflow off
            term xterm-color
            bindkey "^[OH" beginning-of-line
            bindkey "^[OF" end-of-line
            bindkey "^[[H" beginning-of-line
            bindkey "^[[F" end-of-line
            bindkey "\\027[?1049h" stuff ----alternate enter-----
            bindkey "\\027[?1049l" stuff ----alternate leave-----
            termcapinfo xterm* 'hs:ts=\\E]0;:fs=\\007:ds=\\E]0;\\007'
            defhstatus "^Et"
            hardstatus off
            altscreen on
            defutf8 on
            defencoding utf8
        `, 'utf-8')
        return configPath
    }
}
