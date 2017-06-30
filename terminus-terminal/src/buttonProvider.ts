import * as path from 'path'
import { exec } from 'mz/child_process'
import * as fs from 'mz/fs'
import { Injectable } from '@angular/core'
import { HotkeysService, ToolbarButtonProvider, IToolbarButton, AppService, ConfigService, ElectronService, HostAppService, Platform } from 'terminus-core'

import { SessionsService } from './services/sessions.service'
import { TerminalTabComponent } from './components/terminalTab.component'

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private app: AppService,
        private sessions: SessionsService,
        private config: ConfigService,
        private electron: ElectronService,
        private hostApp: HostAppService,
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
        if (command === '~default-shell~') {
            if (this.hostApp.platform === Platform.Linux) {
                let line = (await fs.readFile('/etc/passwd', { encoding: 'utf-8' }))
                    .split('\n').find(x => x.startsWith(process.env.LOGNAME + ':'))
                if (!line) {
                    console.warn('Could not detect user shell')
                    command = '/bin/sh'
                } else {
                    command = line.split(':')[5]
                }
            }
            if (this.hostApp.platform === Platform.macOS) {
                let shellEntry = (await exec(`dscl . -read /Users/${process.env.LOGNAME} UserShell`))[0].toString()
                command = shellEntry.split(':')[1].trim()
            }
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
