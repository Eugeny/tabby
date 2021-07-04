import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'tabby-core'

/** @hidden */
@Injectable()
export class LocalTerminalHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'new-tab',
            name: 'New tab',
        },
    ]

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
