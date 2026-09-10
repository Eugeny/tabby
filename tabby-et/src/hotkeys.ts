import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider, TranslateService } from 'tabby-core'

/** @hidden */
@Injectable()
export class ETHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        { id: 'restart-et-session', name: this.translate.instant('Start a new Eternal Terminal session') },
        { id: 'et-force-reconnect', name: this.translate.instant('Force an Eternal Terminal reconnect') },
    ]

    constructor (private translate: TranslateService) {
        super()
    }

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
