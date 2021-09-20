import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'tabby-core'

/** @hidden */
@Injectable()
export class SSHHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'restart-ssh-session',
            name: 'Restart current SSH session',
        },
        {
            id: 'launch-winscp',
            name: 'Launch WinSCP for current SSH session',
        },
    ]

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
