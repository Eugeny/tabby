import { Injectable } from '@angular/core'
import { HotkeysService, ToolbarButtonProvider, IToolbarButton, AppService } from 'api'
import { SessionsService } from './services/sessions'
import { TerminalTab } from './tab'


@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private app: AppService,
        private sessions: SessionsService,
        hotkeys: HotkeysService,
    ) {
        super()
        hotkeys.matchedHotkey.subscribe(async (hotkey) => {
            if (hotkey == 'new-tab') {
                this.app.openTab(await this.getNewTab())
            }
        })
    }

    async getNewTab (): Promise<TerminalTab> {
        return new TerminalTab(await this.sessions.createNewSession({ command: 'zsh' }))
    }

    provide (): IToolbarButton[] {
        return [{
            icon: 'plus',
            title: 'New terminal',
            click: async () => {
                this.app.openTab(await this.getNewTab())
            }
        }]
    }
}
