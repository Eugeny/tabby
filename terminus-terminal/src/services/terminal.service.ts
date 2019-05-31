import * as fs from 'mz/fs'
import slug from 'slug'
import { Observable, AsyncSubject } from 'rxjs'
import { Injectable, Inject } from '@angular/core'
import { AppService, Logger, LogService, ConfigService, SplitTabComponent } from 'terminus-core'
import { IShell, ShellProvider, SessionOptions, Profile } from '../api'
import { TerminalTabComponent } from '../components/terminalTab.component'
import { UACService } from './uac.service'

@Injectable({ providedIn: 'root' })
export class TerminalService {
    private shells = new AsyncSubject<IShell[]>()
    private logger: Logger

    /**
     * A fresh list of all available shells
     */
    get shells$ (): Observable<IShell[]> { return this.shells }

    /** @hidden */
    constructor (
        private app: AppService,
        private config: ConfigService,
        private uac: UACService,
        @Inject(ShellProvider) private shellProviders: ShellProvider[],
        log: LogService,
    ) {
        this.logger = log.create('terminal')
        this.reloadShells()

        config.changed$.subscribe(() => {
            this.reloadShells()
        })
    }

    private async getShells (): Promise<IShell[]> {
        let shellLists = await Promise.all(this.config.enabledServices(this.shellProviders).map(x => x.provide()))
        return shellLists.reduce((a, b) => a.concat(b), [])
    }

    async getProfiles (includeHidden?: boolean): Promise<Profile[]> {
        let shells = await this.shells$.toPromise()
        return [
            ...this.config.store.terminal.profiles,
            ...shells.filter(x => includeHidden || !x.hidden).map(shell => ({
                name: shell.name,
                icon: shell.icon,
                sessionOptions: this.optionsFromShell(shell),
                isBuiltin: true
            }))
        ]
    }

    private async reloadShells () {
        this.shells = new AsyncSubject<IShell[]>()
        let shells = await this.getShells()
        this.logger.debug('Shells list:', shells)
        this.shells.next(shells)
        this.shells.complete()
    }

    /**
     * Launches a new terminal with a specific shell and CWD
     * @param pause Wait for a keypress when the shell exits
     */
    async openTab (profile?: Profile, cwd?: string, pause?: boolean): Promise<TerminalTabComponent> {
        if (!profile) {
            let profiles = await this.getProfiles(true)
            profile = profiles.find(x => slug(x.name).toLowerCase() === this.config.store.terminal.profile) || profiles[0]
        }

        cwd = cwd || profile.sessionOptions.cwd

        if (cwd && !fs.existsSync(cwd)) {
            console.warn('Ignoring non-existent CWD:', cwd)
            cwd = null
        }

        if (!cwd) {
            if (this.app.activeTab instanceof TerminalTabComponent && this.app.activeTab.session) {
                cwd = await this.app.activeTab.session.getWorkingDirectory()
            }
            if (this.app.activeTab instanceof SplitTabComponent) {
                let focusedTab = this.app.activeTab.getFocusedTab()

                if (focusedTab instanceof TerminalTabComponent && focusedTab.session) {
                    cwd = await focusedTab.session.getWorkingDirectory()
                }
            }
            cwd = cwd || this.config.store.terminal.workingDirectory
            cwd = cwd || null
        }

        this.logger.info(`Starting profile ${profile.name}`, profile)
        let sessionOptions = {
            ...profile.sessionOptions,
            pauseAfterExit: pause,
            cwd,
        }

        return this.openTabWithOptions(sessionOptions)
    }

    optionsFromShell (shell: IShell): SessionOptions {
        return {
            command: shell.command,
            args: shell.args || [],
            env: shell.env,
        }
    }

    /**
     * Open a terminal with custom session options
     */
    openTabWithOptions (sessionOptions: SessionOptions): TerminalTabComponent {
        if (sessionOptions.runAsAdministrator && this.uac.isAvailable) {
            sessionOptions = this.uac.patchSessionOptionsForUAC(sessionOptions)
        }
        this.logger.info('Using session options:', sessionOptions)

        return this.app.openNewTab(
            TerminalTabComponent,
            { sessionOptions }
        ) as TerminalTabComponent
    }
}
