import { Injectable } from '@angular/core'
import { HostAppService } from './api/hostApp'
import { CLIHandler, CLIEvent } from './api/cli'
import { HostWindowService } from './api/hostWindow'
import { QuickConnectProfileProvider } from './api/profileProvider'
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
        if (op === 'recent') {
            this.handleOpenRecentProfile(event.argv.profileNumber)
            return true
        }
        if (op === 'quickConnect') {
            this.handleOpenQuickConnect(event.argv.providerId, event.argv.query)
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

    private async handleOpenRecentProfile (profileNumber: number) {
        const profiles = this.profiles.getRecentProfiles()
        if (profileNumber >= profiles.length) {
            return
        }
        this.profiles.openNewTabForProfile(profiles[profileNumber])
        this.hostWindow.bringToFront()
    }

    private async handleOpenQuickConnect (providerId: string, query: string) {
        const provider = this.profiles.getProviders().find(x => x.id === providerId)
        if(!provider || !(provider instanceof QuickConnectProfileProvider)) {
            console.error(`Requested provider "${providerId}" not found`)
            return
        }
        const profile = provider.quickConnect(query)
        if(!profile) {
            console.error(`Could not parse quick connect query "${query}"`)
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
