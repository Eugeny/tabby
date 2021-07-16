import { Injectable } from '@angular/core'
import { ProfileProvider, NewTabParameters, Profile, PartialProfile } from 'tabby-core'
import { DemoTerminalTabComponent } from './components/terminalTab.component'

@Injectable({ providedIn: 'root' })
export class DemoProfilesService extends ProfileProvider<Profile> {
    id = 'demo'
    name = 'Demo'

    async getBuiltinProfiles (): Promise<PartialProfile<Profile>[]> {
        return [
            {
                id: 'demo',
                type: 'demo',
                name: 'Demo VM terminal',
                icon: 'fas fa-microchip',
                isBuiltin: true,
            },
        ]
    }

    async getNewTabParameters (_profile: Profile): Promise<NewTabParameters<DemoTerminalTabComponent>> {
        return {
            type: DemoTerminalTabComponent,
        }
    }

    getDescription (_profile: Profile): string {
        return ''
    }
}
