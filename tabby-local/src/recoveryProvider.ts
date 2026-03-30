import { Injectable, Injector } from '@angular/core'
import { TabRecoveryProvider, NewTabParameters, RecoveryToken, ProfilesService } from 'tabby-core'

import { TerminalTabComponent } from './components/terminalTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider<TerminalTabComponent> {
    constructor (private injector: Injector) { super() }

    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:local-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<TerminalTabComponent>> {
        return {
            type: TerminalTabComponent,
            inputs: {
                profile: this.injector.get(ProfilesService).getConfigProxyForProfile(recoveryToken.profile),
                savedState: recoveryToken.savedState,
            },
        }
    }
}
