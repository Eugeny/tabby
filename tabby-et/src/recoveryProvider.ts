import { Injectable, Injector } from '@angular/core'
import { TabRecoveryProvider, NewTabParameters, RecoveryToken, ProfilesService } from 'tabby-core'

import { ETTabComponent } from './components/etTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider<ETTabComponent> {
    constructor (private injector: Injector) {
        super()
    }

    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:et-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<ETTabComponent>> {
        return {
            type: ETTabComponent,
            inputs: {
                profile: this.injector.get(ProfilesService).getConfigProxyForProfile(recoveryToken.profile),
                savedState: recoveryToken.savedState,
            },
        }
    }
}
