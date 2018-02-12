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
        @Inject(ShellProvider) private shellProviders: ShellProvider[],
        log: LogService,
    ) {
        this.logger = log.create('terminal')
        this.reloadShells()

        config.changed$.subscribe(() => {
            this.reloadShells()
        })
    }

    async reloadShells () {
        this.shells$ = new AsyncSubject<IShell[]>()
        let shellLists = await Promise.all(this.config.enabledServices(this.shellProviders).map(x => x.provide()))
        this.shells$.next(shellLists.reduce((a, b) => a.concat(b)))
        this.shells$.complete()
    }

    async openTab (shell?: IShell, cwd?: string): Promise<TerminalTabComponent> {
        if (!cwd) {
            if (this.app.activeTab instanceof TerminalTabComponent && this.app.activeTab.session) {
                cwd = await this.app.activeTab.session.getWorkingDirectory()
            } else {
                cwd = this.config.store.terminal.workingDirectory || null
            }
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
