import { Injectable, Injector } from '@angular/core'
import { TabRecoveryProvider, NewTabParameters, RecoveryToken, ProfilesService } from 'tabby-core'

import { SerialTabComponent } from './components/serialTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider<SerialTabComponent> {
    constructor (private injector: Injector) { super() }

    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:serial-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<SerialTabComponent>> {
        return {
            type: SerialTabComponent,
            inputs: {
                profile: this.injector.get(ProfilesService).getConfigProxyForProfile(recoveryToken.profile),
                savedState: recoveryToken.savedState,
            },
        }
    }
}
