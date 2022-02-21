import { Injectable } from '@angular/core'
import { ConfigService } from 'tabby-core'

export interface KnownHostSelector {
    host: string
    port: number
    type: string
}

export interface KnownHost extends KnownHostSelector {
    digest: string
}

@Injectable({ providedIn: 'root' })
export class SSHKnownHostsService {
    constructor (
        private config: ConfigService,
    ) { }

    getFor (selector: KnownHostSelector): KnownHost|null {
        return this.config.store.ssh.knownHosts.find(x => x.host === selector.host && x.port === selector.port && x.type === selector.type) ?? null
    }

    async store (selector: KnownHostSelector, digest: string): Promise<void> {
        const existing = this.getFor(selector)
        if (existing) {
            existing.digest = digest
        } else {
            this.config.store.ssh.knownHosts.push({ ...selector, digest })
        }
        this.config.save()
    }
}
