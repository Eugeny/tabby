import * as fs from 'mz/fs'
import * as path from 'path'
import { Injectable } from '@angular/core'
import { HotkeysService, ToolbarButtonProvider, IToolbarButton, AppService, ConfigService, HostAppService, Platform, ElectronService } from 'terminus-core'

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
        private hostApp: HostAppService,
        electron: ElectronService,
        hotkeys: HotkeysService,
    ) {
        super()
        hotkeys.matchedHotkey.subscribe(async (hotkey) => {
            if (hotkey === 'new-tab') {
                this.openNewTab()
            }
        })
        hostApp.secondInstance$.subscribe(async ({argv, cwd}) => {
            if (argv.length === 2) {
                let arg = path.resolve(cwd, argv[1])
                if (await fs.exists(arg)) {
                    this.openNewTab(arg)
                }
            }
        })
        if (!electron.remote.process.env.DEV) {
            setImmediate(async () => {
                let argv: string[] = electron.remote.process.argv
                for (let arg of argv.slice(1).concat([electron.remote.process.argv0])) {
                    if (await fs.exists(arg)) {
                        if ((await fs.stat(arg)).isDirectory()) {
                            this.openNewTab(arg)
                        }
                    }
                }
            })
        }
    }

    async openNewTab (cwd?: string): Promise<void> {
        if (!cwd && this.app.activeTab instanceof TerminalTabComponent) {
            cwd = await this.app.activeTab.session.getWorkingDirectory()
        }
        let command = this.config.store.terminal.shell
        let env: any = process.env
        let args: string[] = []
        if (command === '~clink~') {
            ({ command, args } = this.shells.getClinkOptions())
        }
        if (command === '~default-shell~') {
            command = await this.shells.getDefaultShell()
        }
        if (this.hostApp.platform === Platform.Windows) {
            env.TERM = 'cygwin'
        }
        let sessionOptions = await this.sessions.prepareNewSession({
            command,
            args,
            cwd,
            env,
        })
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
