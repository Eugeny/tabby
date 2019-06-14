import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'terminus-core'

/** @hidden */
@Injectable()
export class SettingsHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'settings',
            name: 'Open Settings',
        },
    ]

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
