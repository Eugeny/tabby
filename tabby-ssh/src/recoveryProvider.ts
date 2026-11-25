import { Injectable, Injector } from '@angular/core'
import { TabRecoveryProvider, NewTabParameters, RecoveryToken, ProfilesService } from 'tabby-core'

import { SSHTabComponent } from './components/sshTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider<SSHTabComponent> {
    constructor (private injector: Injector) { super() }

    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:ssh-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<SSHTabComponent>> {
        const profiles = this.injector.get(ProfilesService)
        const snapshot = recoveryToken.profile
        const saved = snapshot.id ? (await profiles.getProfiles({ includeBuiltin: false })).find(
            profile => profile.id === snapshot.id && profile.type === snapshot.type,
        ) : undefined
        // Clone saved options so restoring a tab's working directory cannot
        // change the saved profile. Deleted and temporary profiles use the token.
        const profile = profiles.getConfigProxyForProfile(saved ? {
            ...saved,
            options: { ...saved.options },
        } : snapshot)
        if (saved && profile.options.rememberCwd && snapshot.options?.rememberCwd && snapshot.options.cwd) {
            profile.options.cwd = snapshot.options.cwd
        }
        return {
            type: SSHTabComponent,
            inputs: {
                profile,
                savedState: recoveryToken.savedState,
            },
        }
    }
}
