import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'terminus-core'

/** @hidden */
@Injectable()
export class SSHHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'ssh',
            name: 'Show SSH connections',
        },
        {
            id: 'restart-ssh-session',
            name: 'Restart current SSH session',
        },
    ]

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
