import * as path from 'path'
import { Injectable } from '@angular/core'
import { HotkeysService, ToolbarButtonProvider, IToolbarButton, AppService, ConfigService, ElectronService } from 'terminus-core'

import { SessionsService } from './services/sessions.service'
import { TerminalTabComponent } from './components/terminalTab.component'

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private app: AppService,
        private sessions: SessionsService,
        private config: ConfigService,
        private electron: ElectronService,
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
        // TODO move this?
        if (command === '~clink~') {
            command = 'cmd.exe'
            args = [
                '/k',
                path.join(
                    path.dirname(this.electron.app.getPath('exe')),
                    (process.platform === 'darwin') ? '../Resources' : 'resources',
                    'clink',
                    `clink_${process.arch}.exe`,
                ),
                'inject',
            ]
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
