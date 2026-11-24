/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { CommandProvider, AppService, Command, CommandLocation } from 'tabby-core'
import { DemoTerminalTabComponent } from './components/terminalTab.component'

/** @hidden */
@Injectable({ providedIn: 'root' })
export class DemoCommandProvider extends CommandProvider {
    constructor (
        private app: AppService,
    ) {
        super()
    }

    async provide (): Promise<Command[]> {
        return [{
            id: 'web-demo:new-terminal',
            icon: require('./icons/plus.svg'),
            label: 'New demo terminal',
            locations: [CommandLocation.LeftToolbar, CommandLocation.StartPage],
            run: async () => {
                this.app.openNewTab({ type: DemoTerminalTabComponent })
            },
        }]
    }
}
