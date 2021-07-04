import { Injectable } from '@angular/core'
import { ProfileProvider, Profile, NewTabParameters } from 'tabby-core'
import { TelnetProfileSettingsComponent } from './components/telnetProfileSettings.component'
import { TelnetTabComponent } from './components/telnetTab.component'
import { TelnetProfile } from './session'

@Injectable({ providedIn: 'root' })
export class TelnetProfilesService extends ProfileProvider {
    id = 'telnet'
    name = 'Telnet'
    supportsQuickConnect = true
    settingsComponent = TelnetProfileSettingsComponent

    async getBuiltinProfiles (): Promise<TelnetProfile[]> {
        return [{
            id: `telnet:template`,
            type: 'telnet',
            name: 'Telnet/socket connection',
            icon: 'fas fa-network-wired',
            options: {
                host: '',
                port: 23,
                inputMode: 'local-echo',
                outputMode: null,
                inputNewlines: null,
                outputNewlines: 'crlf',
            },
            isBuiltin: true,
            isTemplate: true,
        }]
    }

    async getNewTabParameters (profile: Profile): Promise<NewTabParameters<TelnetTabComponent>> {
        return {
            type: TelnetTabComponent,
            inputs: { profile },
        }
    }

    getDescription (profile: TelnetProfile): string {
        return profile.options.host ? `${profile.options.host}:${profile.options.port}` : ''
    }

    quickConnect (query: string): TelnetProfile|null {
        if (!query.startsWith('telnet:')) {
            return null
        }
        query = query.substring('telnet:'.length)

        let host = query
        let port = 23
        if (host.includes('[')) {
            port = parseInt(host.split(']')[1].substring(1))
            host = host.split(']')[0].substring(1)
        } else if (host.includes(':')) {
            port = parseInt(host.split(/:/g)[1])
            host = host.split(':')[0]
        }

        return {
            name: query,
            type: 'telnet',
            options: {
                host,
                port,
                inputMode: 'local-echo',
                outputNewlines: 'crlf',
            },
        }
    }
}
