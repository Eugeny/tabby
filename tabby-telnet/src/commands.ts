import { Injectable } from '@angular/core'
import { CommandProvider, Command, CommandContext, TranslateService } from 'tabby-core'

import { TelnetTabComponent } from './components/telnetTab.component'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class TelnetCommandProvider extends CommandProvider {
    constructor (private translate: TranslateService) {
        super()
    }

    async provide (context: CommandContext): Promise<Command[]> {
        const tab = context.tab
        if (!(tab instanceof TelnetTabComponent)) {
            return []
        }
        return [{
            id: 'telnet:restart-session',
            label: this.translate.instant('Restart current Telnet session'),
            locations: [],
            hotkey: 'restart-telnet-session',
            run: async () => tab.reconnect(),
        }]
    }
}
