import * as path from 'path'
import * as fs from 'mz/fs'
import { Injectable } from '@angular/core'
import { CLIHandler, CLIEvent, HostAppService, AppService, ConfigService } from 'terminus-core'
import { TerminalService } from './services/terminal.service'

@Injectable()
export class TerminalCLIHandler extends CLIHandler {
    firstMatchOnly = true
    priority = 0

    constructor (
        private config: ConfigService,
        private hostApp: HostAppService,
        private terminal: TerminalService,
    ) {
        super()
    }

    async handle (event: CLIEvent): Promise<boolean> {
        const op = event.argv._[0]

        if (op === 'open') {
            this.handleOpenDirectory(path.resolve(event.cwd, event.argv.directory))
        } else if (op === 'run') {
            this.handleRunCommand(event.argv.command)
        } else if (op === 'profile') {
            this.handleOpenProfile(event.argv.profileName)
        } else {
            return false
        }

        return true
    }

    private async handleOpenDirectory (directory: string) {
        if (directory.length > 1 && (directory.endsWith('/') || directory.endsWith('\\'))) {
            directory = directory.substring(0, directory.length - 1)
        }
        if (await fs.exists(directory)) {
            if ((await fs.stat(directory)).isDirectory()) {
                this.terminal.openTab(undefined, directory)
                this.hostApp.bringToFront()
            }
        }
    }

    private handleRunCommand (command: string[]) {
        this.terminal.openTab({
            name: '',
            sessionOptions: {
                command: command[0],
                args: command.slice(1),
            },
        }, null, true)
        this.hostApp.bringToFront()
    }

    private handleOpenProfile (profileName: string) {
        const profile = this.config.store.terminal.profiles.find(x => x.name === profileName)
        if (!profile) {
            console.error('Requested profile', profileName, 'not found')
            return
        }
        this.terminal.openTabWithOptions(profile.sessionOptions)
        this.hostApp.bringToFront()
    }
}


@Injectable()
export class OpenPathCLIHandler extends CLIHandler {
    firstMatchOnly = true
    priority = -100

    constructor (
        private terminal: TerminalService,
        private hostApp: HostAppService,
    ) {
        super()
    }

    async handle (event: CLIEvent): Promise<boolean> {
        const op = event.argv._[0]
        const opAsPath = op ? path.resolve(event.cwd, op) : null

        if (opAsPath && (await fs.lstat(opAsPath)).isDirectory()) {
            this.terminal.openTab(undefined, opAsPath)
            this.hostApp.bringToFront()
            return true
        }

        return false
    }
}

@Injectable()
export class AutoOpenTabCLIHandler extends CLIHandler {
    firstMatchOnly = true
    priority = -1000

    constructor (
        private app: AppService,
        private config: ConfigService,
        private terminal: TerminalService,
    ) {
        super()
    }

    async handle (event: CLIEvent): Promise<boolean> {
        if (!event.secondInstance && this.config.store.terminal.autoOpen) {
            this.app.ready$.subscribe(() => {
                this.terminal.openTab()
            })
            return true
        }
        return false
    }
}
