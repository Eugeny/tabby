import { Injectable } from '@angular/core'
import { SSHProfile } from '../api'
import { PartialProfile, ProfilesService } from 'tabby-core'
import { SSHSession } from '../session/ssh'

@Injectable({ providedIn: 'root' })
export class SSHMultiplexerService {
    private sessions = new Map<string, SSHSession>()

    constructor (
        private profilesService: ProfilesService,
    ) { }

    async addSession (session: SSHSession): Promise<void> {
        const key = await this.getMultiplexerKey(session.profile)
        this.sessions.set(key, session)
        session.willDestroy$.subscribe(() => {
            if (this.sessions.get(key) === session) {
                this.sessions.delete(key)
            }
        })
    }

    async getSession (profile: PartialProfile<SSHProfile>): Promise<SSHSession|null> {
        const fullProfile = this.profilesService.getConfigProxyForProfile(profile)
        const key = await this.getMultiplexerKey(fullProfile)
        return this.sessions.get(key) ?? null
    }

    private async getMultiplexerKey (profile: SSHProfile) {
        let key = `${profile.options.host}:${profile.options.port}:${profile.options.user}:${profile.options.proxyCommand}:${profile.options.socksProxyHost}:${profile.options.socksProxyPort}:${profile.options.httpProxyHost}:${profile.options.httpProxyPort}`
        if (profile.options.jumpHost) {
            const allProfiles = await this.profilesService.getProfiles()
            let jumpConnection = allProfiles.find(x => x.id === profile.options.jumpHost)

            // If not found by ID, try to find by hostname (for SSH profiles)
            if (!jumpConnection && profile.options.jumpHost.includes(':')) {
                const hostnameMatch = profile.options.jumpHost.split(':').pop()
                if (hostnameMatch) {
                    jumpConnection = allProfiles.find(x =>
                        x.type === 'ssh' &&
                        (x as PartialProfile<SSHProfile>).options?.host === hostnameMatch,
                    )
                }
            }

            // If still not found, try to find by name (for imported profiles)
            if (!jumpConnection) {
                jumpConnection = allProfiles.find(x =>
                    x.type === 'ssh' &&
                    (x.name === profile.options.jumpHost ||
                     x.name === `${profile.options.jumpHost} (.ssh/config)`),
                )
            }

            if (!jumpConnection) {
                return key
            }
            const jumpProfile = this.profilesService.getConfigProxyForProfile<SSHProfile>(jumpConnection)
            key += '$' + await this.getMultiplexerKey(jumpProfile)
        }
        return key
    }
}
