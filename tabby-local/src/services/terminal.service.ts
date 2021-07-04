import * as fs from 'mz/fs'
import { Injectable } from '@angular/core'
import { Logger, LogService, ConfigService, AppService, ProfilesService } from 'tabby-core'
import { TerminalTabComponent } from '../components/terminalTab.component'
import { SessionOptions, LocalProfile } from '../api'

@Injectable({ providedIn: 'root' })
export class TerminalService {
    private logger: Logger

    /** @hidden */
    private constructor (
        private app: AppService,
        private profilesService: ProfilesService,
        private config: ConfigService,
        log: LogService,
    ) {
        this.logger = log.create('terminal')
    }

    async getDefaultProfile (): Promise<LocalProfile> {
        const profiles = await this.profilesService.getProfiles()
        let profile = profiles.find(x => x.id === this.config.store.terminal.profile)
        if (!profile) {
            profile = profiles.filter(x => x.type === 'local' && x.isBuiltin)[0]
        }
        return profile as LocalProfile
    }

    /**
     * Launches a new terminal with a specific shell and CWD
     * @param pause Wait for a keypress when the shell exits
     */
    async openTab (profile?: LocalProfile|null, cwd?: string|null, pause?: boolean): Promise<TerminalTabComponent> {
        if (!profile) {
            profile = await this.getDefaultProfile()
        }

        cwd = cwd ?? profile.options.cwd

        if (cwd && !fs.existsSync(cwd)) {
            console.warn('Ignoring non-existent CWD:', cwd)
            cwd = null
        }

        this.logger.info(`Starting profile ${profile.name}`, profile)
        const options = {
            ...profile.options,
            pauseAfterExit: pause,
            cwd: cwd ?? undefined,
        }

        return (await this.profilesService.openNewTabForProfile({
            ...profile,
            options,
        })) as TerminalTabComponent
    }

    /**
     * Open a terminal with custom session options
     */
    openTabWithOptions (sessionOptions: SessionOptions): TerminalTabComponent {
        this.logger.info('Using session options:', sessionOptions)
        return this.app.openNewTab({
            type: TerminalTabComponent,
            inputs: { sessionOptions },
        }) as TerminalTabComponent
    }
}
