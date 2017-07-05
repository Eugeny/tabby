import { Injectable } from '@angular/core'
import { HotkeysService, ToolbarButtonProvider, IToolbarButton, AppService, ConfigService } from 'terminus-core'

import { SessionsService } from './services/sessions.service'
import { ShellsService } from './services/shells.service'
import { TerminalTabComponent } from './components/terminalTab.component'

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private app: AppService,
        private sessions: SessionsService,
        private config: ConfigService,
        private shells: ShellsService,
        hotkeys: HotkeysService,
    ) {
        super()
        hotkeys.matchedHotkey.subscribe(async (hotkey) => {
            if (hotkey === 'new-tab') {
                this.openNewTab()
            }
        })
    }

    async openNewTab (): Promise<void> {
        let cwd = null
        if (this.app.activeTab instanceof TerminalTabComponent) {
            cwd = await this.app.activeTab.session.getWorkingDirectory()
        }
        let command = this.config.store.terminal.shell
        let args = []
        if (command === '~clink~') {
            ({ command, args } = this.shells.getClinkOptions())
        }
        if (command === '~default-shell~') {
            command = await this.shells.getDefaultShell()
        }
        let sessionOptions = await this.sessions.prepareNewSession({ command, args, cwd })
        this.app.openNewTab(
            TerminalTabComponent,
            { sessionOptions }
        )
    }

    provide (): IToolbarButton[] {
        return [{
            icon: 'plus',
            title: 'New terminal',
            click: async () => {
                this.openNewTab()
            }
        }]
    }
}
