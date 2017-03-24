import { Injectable } from '@angular/core'
import { IToolbarButtonProvider, IToolbarButton, AppService } from 'api'
import { SessionsService } from './services/sessions'
import { TerminalTab } from './tab'


@Injectable()
export class ButtonProvider implements IToolbarButtonProvider {
    constructor (
        private app: AppService,
        private sessions: SessionsService,
    ) {

    }

    provide (): IToolbarButton[] {
        return [{
            icon: 'plus',
            title: 'New terminal',
            click: () => {
                let session = this.sessions.createNewSession({ command: 'zsh' })
                this.app.openTab(new TerminalTab(session))
            }
        }]
    }
}
