import { Injectable } from '@angular/core'
import { HostAppService } from './api/hostApp'
import { CLIHandler, CLIEvent } from './api/cli'
import { HostWindowService } from './api/hostWindow'
import { ProfilesService } from './services/profiles.service'

@Injectable()
export class ProfileCLIHandler extends CLIHandler {
    firstMatchOnly = true
    priority = 0

    constructor (
        private profiles: ProfilesService,
        private hostWindow: HostWindowService,
    ) {
        super()
    }

    async handle (event: CLIEvent): Promise<boolean> {
        const op = event.argv._[0]

        if (op === 'profile') {
            this.handleOpenProfile(event.argv.profileName)
            return true
        }
        return false
    }

    private async handleOpenProfile (profileName: string) {
        const profile = (await this.profiles.getProfiles()).find(x => x.name === profileName)
        if (!profile) {
            console.error('Requested profile', profileName, 'not found')
            return
        }
        this.profiles.openNewTabForProfile(profile)
        this.hostWindow.bringToFront()
    }
}

@Injectable()
export class LastCLIHandler extends CLIHandler {
    firstMatchOnly = true
    priority = -999

    constructor (private hostApp: HostAppService) {
        super()
    }

    async handle (event: CLIEvent): Promise<boolean> {
        if (event.secondInstance) {
            this.hostApp.newWindow()
            return true
        }
        return false
    }
}
