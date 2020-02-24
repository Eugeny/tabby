import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'terminus-core'

/** @hidden */
@Injectable()
export class SerialHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'serial',
            name: 'Show Serial connections',
        },
    ]

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
