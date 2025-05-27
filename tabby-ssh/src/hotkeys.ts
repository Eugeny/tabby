import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider, TranslateService } from 'tabby-core'

/** @hidden */
@Injectable()
export class SSHHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'restart-ssh-session',
            name: this.translate.instant('Restart current SSH session'),
        },
        {
            id: 'launch-winscp',
            name: this.translate.instant('Launch WinSCP for current SSH session'),
        },
        {
            id: 'paste-ssh-password',
            name: this.translate.instant('Paste active profile password'),
        },
    ]

    constructor (private translate: TranslateService) { super() }

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
