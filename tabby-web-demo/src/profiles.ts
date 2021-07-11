import { Injectable } from '@angular/core'
import { ProfileProvider, NewTabParameters, Profile } from 'tabby-core'
// import { SerialProfileSettingsComponent } from './components/serialProfileSettings.component'
import { DemoTerminalTabComponent } from './components/terminalTab.component'

@Injectable({ providedIn: 'root' })
export class DemoProfilesService extends ProfileProvider {
    id = 'demo'
    name = 'Demo'
    // settingsComponent = SerialProfileSettingsComponent

    async getBuiltinProfiles (): Promise<Profile[]> {
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
