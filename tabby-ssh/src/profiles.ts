import { Injectable } from '@angular/core'
import { ProfileProvider, Profile, NewTabParameters } from 'tabby-core'
import { SSHProfileSettingsComponent } from './components/sshProfileSettings.component'
import { SSHTabComponent } from './components/sshTab.component'
import { PasswordStorageService } from './services/passwordStorage.service'
import { SSHProfile } from './api'

@Injectable({ providedIn: 'root' })
export class SSHProfilesService extends ProfileProvider {
    id = 'ssh'
    name = 'SSH'
    supportsQuickConnect = true
    settingsComponent = SSHProfileSettingsComponent

    constructor (
        private passwordStorage: PasswordStorageService
    ) {
        super()
    }

    async getBuiltinProfiles (): Promise<Profile[]> {
        return [{
            id: `ssh:template`,
            type: 'ssh',
            name: 'SSH connection',
            icon: 'fas fa-desktop',
            options: {
                host: '',
                port: 22,
                user: 'root',
            },
            isBuiltin: true,
            isTemplate: true,
        }]
    }

    async getNewTabParameters (profile: Profile): Promise<NewTabParameters<SSHTabComponent>> {
        return {
            type: SSHTabComponent,
            inputs: { profile },
        }
    }

    getDescription (profile: SSHProfile): string {
        return profile.options.host
    }

    deleteProfile (profile: SSHProfile): void {
        this.passwordStorage.deletePassword(profile)
    }

    quickConnect (query: string): SSHProfile {
        let user = 'root'
        let host = query
        let port = 22
        if (host.includes('@')) {
            const parts = host.split(/@/g)
            host = parts[parts.length - 1]
            user = parts.slice(0, parts.length - 1).join('@')
        }
        if (host.includes('[')) {
            port = parseInt(host.split(']')[1].substring(1))
            host = host.split(']')[0].substring(1)
        } else if (host.includes(':')) {
            port = parseInt(host.split(/:/g)[1])
            host = host.split(':')[0]
        }

        return {
            name: query,
            type: 'ssh',
            options: {
                host,
                user,
                port,
            },
        }
    }
}
