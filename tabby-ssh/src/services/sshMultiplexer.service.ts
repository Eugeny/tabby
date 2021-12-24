import { Injectable } from '@angular/core'
import { SSHProfile } from '../api'
import { ConfigService, PartialProfile, ProfilesService } from 'tabby-core'
import { SSHSession } from '../session/ssh'

@Injectable({ providedIn: 'root' })
export class SSHMultiplexerService {
    private sessions = new Map<string, SSHSession>()

    constructor (
        private config: ConfigService,
        private profilesService: ProfilesService,
    ) { }

    addSession (session: SSHSession): void {
        const key = this.getMultiplexerKey(session.profile)
        this.sessions.set(key, session)
        session.willDestroy$.subscribe(() => {
            this.sessions.delete(key)
        })
    }

    getSession (profile: PartialProfile<SSHProfile>): SSHSession|null {
        const fullProfile = this.profilesService.getConfigProxyForProfile(profile)
        const key = this.getMultiplexerKey(fullProfile)
        return this.sessions.get(key) ?? null
    }

    private getMultiplexerKey (profile: SSHProfile) {
        let key = `${profile.options.host}:${profile.options.port}:${profile.options.user}:${profile.options.proxyCommand}:${profile.options.socksProxyHost}:${profile.options.socksProxyPort}`
        if (profile.options.jumpHost) {
            const jumpConnection = this.config.store.profiles.find(x => x.id === profile.options.jumpHost)
            const jumpProfile = this.profilesService.getConfigProxyForProfile(jumpConnection)
            key += '$' + this.getMultiplexerKey(jumpProfile)
        }
        return key
    }
}
