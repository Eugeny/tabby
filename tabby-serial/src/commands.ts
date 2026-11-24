import { Injectable } from '@angular/core'
import { CommandProvider, Command, CommandContext, TranslateService } from 'tabby-core'

import { SerialTabComponent } from './components/serialTab.component'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class SerialCommandProvider extends CommandProvider {
    constructor (private translate: TranslateService) {
        super()
    }

    async provide (context: CommandContext): Promise<Command[]> {
        const tab = context.tab
        if (!(tab instanceof SerialTabComponent)) {
            return []
        }
        return [{
            id: 'serial:restart-session',
            label: this.translate.instant('Restart current serial session'),
            locations: [],
            hotkey: 'restart-serial-session',
            run: async () => tab.reconnect(),
        }]
    }
}
