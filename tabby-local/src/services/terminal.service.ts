import { Injectable } from '@angular/core'
import { Logger, LogService, ConfigService, ProfilesService, PartialProfile } from 'tabby-core'
import { TerminalTabComponent } from '../components/terminalTab.component'
import { LocalProfile } from '../api'
import { resolveGuestCWD } from '../wslPath'
import { isDirectorySync } from '../util'

@Injectable({ providedIn: 'root' })
export class TerminalService {
    private logger: Logger

    /** @hidden */
    private constructor (
        private profilesService: ProfilesService,
        private config: ConfigService,
        log: LogService,
    ) {
        this.logger = log.create('terminal')
    }

    async getDefaultProfile (): Promise<PartialProfile<LocalProfile>> {
        const profiles = await this.profilesService.getProfiles()
        let profile = profiles.find(x => x.id === this.config.store.terminal.profile)
        if (!profile) {
            profile = profiles.filter(x => x.type === 'local' && x.isBuiltin)[0]
        }
        return profile
    }

    /**
     * Launches a new terminal with a specific shell and CWD
     * @param pause Wait for a keypress when the shell exits
     */
    async openTab (profile?: PartialProfile<LocalProfile>|null, cwd?: string|null, pause?: boolean): Promise<TerminalTabComponent|null> {
        if (!profile) {
            profile = await this.getDefaultProfile()
        }

        const fullProfile = this.profilesService.getConfigProxyForProfile(profile)

        cwd = resolveGuestCWD(cwd ?? fullProfile.options.cwd, fullProfile.options.fsBase)

        if (cwd && !isDirectorySync(cwd)) {
            console.warn('Ignoring invalid CWD:', cwd)
            cwd = null
        }

        this.logger.info(`Starting profile ${fullProfile.name}`, fullProfile)
        const options = {
            ...fullProfile.options,
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            pauseAfterExit: fullProfile.options.pauseAfterExit || pause,
            cwd: cwd ?? undefined,
        }

        return (await this.profilesService.openNewTabForProfile({
            ...fullProfile,
            options,
        })) as TerminalTabComponent|null
    }
}
