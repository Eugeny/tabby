import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, IToolbarButton, AppService } from 'api'
import { SessionsService } from './services/sessions'
import { TerminalTab } from './tab'


@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private app: AppService,
        private sessions: SessionsService,
    ) {
        super()
    }

    provide (): IToolbarButton[] {
        return [{
            icon: 'plus',
            title: 'New terminal',
            click: async () => {
                let session = await this.sessions.createNewSession({ command: 'zsh' })
                this.app.openTab(new TerminalTab(session))
            }
        }]
    }
}
