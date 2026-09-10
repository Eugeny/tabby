import { Injectable } from '@angular/core'
import { NewTabParameters, PartialProfile, QuickConnectProfileProvider, TranslateService } from 'tabby-core'

import { ETProfile } from './api/interfaces'
import { ETProfileSettingsComponent } from './components/etProfileSettings.component'
import { ETTabComponent } from './components/etTab.component'
import { parseQuickConnectQuery } from './quickConnect'
import { DEFAULT_ET_PORT } from './protocol/constants'

@Injectable({ providedIn: 'root' })
export class ETProfilesService extends QuickConnectProfileProvider<ETProfile> {
    id = 'et'
    name = 'Eternal Terminal'
    settingsComponent = ETProfileSettingsComponent
    configDefaults = {
        options: {
            host: '',
            port: DEFAULT_ET_PORT,
            user: '',
            sshPort: 22,
            sshProfile: null,
            etterminalPath: null,
            serverFifo: null,
            killOtherSessions: false,
            verbose: 0,
            bootstrapCaptureLimit: null,
            keepaliveInterval: 5,
            maxReconnectAttempts: 0,
            forwardedPorts: [],
            forwardAgent: false,
            environmentVariables: {},
            jumpHost: null,
            jumpPort: DEFAULT_ET_PORT,
            jumpSshProfile: null,
            jumpSshPort: 22,
            warnOnClose: null,
            scripts: [],
            input: { backspace: 'backspace' },
        },
        clearServiceMessagesOnConnect: true,
    }

    constructor (private translate: TranslateService) {
        super()
    }

    async getBuiltinProfiles (): Promise<PartialProfile<ETProfile>[]> {
        return [
            {
                id: 'et:template',
                type: 'et',
                name: this.translate.instant('Eternal Terminal connection'),
                icon: 'fas fa-infinity',
                options: { host: '', port: DEFAULT_ET_PORT, user: '' },
                isBuiltin: true,
                isTemplate: true,
                weight: -1,
            },
        ]
    }

    async getNewTabParameters (profile: ETProfile): Promise<NewTabParameters<ETTabComponent>> {
        return { type: ETTabComponent, inputs: { profile } }
    }

    getSuggestedName (profile: ETProfile): string {
        return `${profile.options.user}@${profile.options.host}:${profile.options.port}`
    }

    getDescription (profile: PartialProfile<ETProfile>): string {
        return profile.options?.host ?? ''
    }

    /**
     * Accepts "user@host", "user@host:2022", "user@[::1]:2022", and tolerates a
     * leading "et " or "et://" so users can paste a command line.
     */
    quickConnect (query: string): PartialProfile<ETProfile> {
        const target = parseQuickConnectQuery(query)
        return {
            name: query,
            type: 'et',
            options: { host: target.host, user: target.user, port: target.port },
        }
    }

    intoQuickConnectString (profile: ETProfile): string|null {
        let s = profile.options.host
        if (profile.options.user) {
            s = `${profile.options.user}@${s}`
        }
        if (profile.options.port !== DEFAULT_ET_PORT) {
            s = `${s}:${profile.options.port}`
        }
        return s
    }
}
