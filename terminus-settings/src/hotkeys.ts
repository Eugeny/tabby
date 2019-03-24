import { Injectable } from '@angular/core'
import { IHotkeyDescription, HotkeyProvider } from 'terminus-core'

/** @hidden */
@Injectable()
export class SettingsHotkeyProvider extends HotkeyProvider {
    hotkeys: IHotkeyDescription[] = [
        {
            id: 'settings',
            name: 'Open Settings',
        },
    ]

    async provide (): Promise<IHotkeyDescription[]> {
        return this.hotkeys
    }
}
