import * as fs from 'mz/fs'
import { Injectable } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { HotkeysService, ToolbarButtonProvider, IToolbarButton, HostAppService, ElectronService } from 'terminus-core'

import { TerminalService } from './services/terminal.service'

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private terminal: TerminalService,
        private domSanitizer: DomSanitizer,
        hostApp: HostAppService,
        electron: ElectronService,
        hotkeys: HotkeysService,
    ) {
        super()
        hotkeys.matchedHotkey.subscribe(async (hotkey) => {
            if (hotkey === 'new-tab') {
                this.terminal.openTab()
            }
        })
        hostApp.cliOpenDirectory$.subscribe(async directory => {
            if (await fs.exists(directory)) {
                if ((await fs.stat(directory)).isDirectory()) {
                    this.terminal.openTab(null, directory)
                }
            }
        })
        hostApp.cliRunCommand$.subscribe(async command => {
            this.terminal.openTab({
                id: '',
                command: command[0],
                args: command.slice(1),
            }, null, true)
        })
        if (!electron.remote.process.env.DEV) {
            setImmediate(async () => {
                let argv: string[] = electron.remote.process.argv
                for (let arg of argv.slice(1).concat([electron.remote.process.argv0])) {
                    if (await fs.exists(arg)) {
                        if ((await fs.stat(arg)).isDirectory()) {
                            this.terminal.openTab(null, arg)
                        }
                    }
                }
            })
        }
    }

    provide (): IToolbarButton[] {
        return [{
            icon: this.domSanitizer.bypassSecurityTrustHtml(require('./icons/plus.svg')),
            title: 'New terminal',
            touchBarNSImage: 'NSTouchBarAddDetailTemplate',
            click: async () => {
                this.terminal.openTab()
            }
        }]
    }
}
