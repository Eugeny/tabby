import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'terminus-core'
import { TerminalService } from './services/terminal.service'

/** @hidden */
@Injectable()
export class TerminalHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'new-tab',
            name: 'New tab',
        },
    ]

    constructor (
        private terminal: TerminalService,
    ) { super() }

    async provide (): Promise<HotkeyDescription[]> {
        const profiles = await this.terminal.getProfiles()
        return [
            ...this.hotkeys,
            ...profiles.map(profile => ({
                id: `profile.${this.terminal.getProfileID(profile)}`,
                name: `New tab: ${profile.name}`,
            })),
        ]
    }
}
