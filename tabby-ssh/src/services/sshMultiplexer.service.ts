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
        const state = { destroyed: false }
        let key: string|null = null
        // Observe destruction before resolving a possibly asynchronous jump-host key.
        const subscription = session.willDestroy$.subscribe(() => {
            state.destroyed = true
            if (key && this.sessions.get(key) === session) {
                this.sessions.delete(key)
            }
        })
        try {
            key = await this.getMultiplexerKey(session.profile)
        } catch (error) {
            subscription.unsubscribe()
            throw error
        }
        if (state.destroyed || !session.isReusable) {
            subscription.unsubscribe()
            return
        }
        this.sessions.set(key, session)
    }

    async getSession (profile: PartialProfile<SSHProfile>): Promise<SSHSession|null> {
        const fullProfile = this.profilesService.getConfigProxyForProfile(profile)
        const key = await this.getMultiplexerKey(fullProfile)
        const session = this.sessions.get(key)
        if (session && !session.isReusable) {
            this.sessions.delete(key)
            return null
        }
        return session ?? null
    }

    private async getMultiplexerKey (profile: SSHProfile) {
        let key = `${profile.options.host}:${profile.options.port}:${profile.options.user}:${profile.options.proxyCommand}:${profile.options.socksProxyHost}:${profile.options.socksProxyPort}:${profile.options.httpProxyHost}:${profile.options.httpProxyPort}`
        if (profile.options.jumpHost) {
            const jumpConnection = (await this.profilesService.getProfiles()).find(x => x.id === profile.options.jumpHost)
            if (!jumpConnection) {
                return key
            }
            const jumpProfile = this.profilesService.getConfigProxyForProfile<SSHProfile>(jumpConnection)
            key += '$' + await this.getMultiplexerKey(jumpProfile)
        }
        return key
    }
}
