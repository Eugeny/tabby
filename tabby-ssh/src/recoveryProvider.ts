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
        return {
            type: SSHTabComponent,
            inputs: {
                profile: this.injector.get(ProfilesService).getConfigProxyForProfile(recoveryToken.profile),
                savedState: recoveryToken.savedState,
            },
        }
    }
}
