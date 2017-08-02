import { Injectable } from '@angular/core'
import { AppService, Logger, LogService } from 'terminus-core'
import { IShell } from '../api'
import { SessionsService } from './sessions.service'
import { TerminalTabComponent } from '../components/terminalTab.component'

@Injectable()
export class TerminalService {
    private logger: Logger

    constructor (
        private app: AppService,
        private sessions: SessionsService,
        log: LogService,
    ) {
        this.logger = log.create('terminal')
    }

    async openTab (shell: IShell, cwd?: string): Promise<TerminalTabComponent> {
        if (!cwd && this.app.activeTab instanceof TerminalTabComponent) {
            cwd = await this.app.activeTab.session.getWorkingDirectory()
        }
        let env: any = Object.assign({}, process.env, shell.env || {})

        this.logger.log(`Starting shell ${shell.name}`, shell)
        let sessionOptions = await this.sessions.prepareNewSession({
            command: shell.command,
            args: shell.args || [],
            cwd,
            env,
        })

        this.logger.log('Using session options:', sessionOptions)

        return this.app.openNewTab(
            TerminalTabComponent,
            { sessionOptions }
        ) as TerminalTabComponent
    }
}
