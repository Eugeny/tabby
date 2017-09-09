import { AsyncSubject } from 'rxjs'
import { Injectable, Inject } from '@angular/core'
import { AppService, Logger, LogService, ConfigService } from 'terminus-core'
import { IShell, ShellProvider } from '../api'
import { SessionsService } from './sessions.service'
import { TerminalTabComponent } from '../components/terminalTab.component'

@Injectable()
export class TerminalService {
    shells$ = new AsyncSubject<IShell[]>()
    private logger: Logger

    constructor (
        private app: AppService,
        private sessions: SessionsService,
        private config: ConfigService,
        @Inject(ShellProvider) shellProviders: ShellProvider[],
        log: LogService,
    ) {
        this.logger = log.create('terminal')
        Promise.all(shellProviders.map(x => x.provide())).then(shellLists => {
            this.shells$.next(shellLists.reduce((a, b) => a.concat(b)))
            this.shells$.complete()
        })
    }

    async openTab (shell?: IShell, cwd?: string): Promise<TerminalTabComponent> {
        if (!cwd && this.app.activeTab instanceof TerminalTabComponent) {
            cwd = await this.app.activeTab.session.getWorkingDirectory()
        }
        if (!shell) {
            let shells = await this.shells$.toPromise()
            shell = shells.find(x => x.id === this.config.store.terminal.shell) || shells[0]
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
            { sessionOptions, shell }
        ) as TerminalTabComponent
    }
}
