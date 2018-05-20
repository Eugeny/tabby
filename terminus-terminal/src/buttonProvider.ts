import * as fs from 'mz/fs'
import * as path from 'path'
import { first } from 'rxjs/operators'
import { Injectable } from '@angular/core'
import { HotkeysService, ToolbarButtonProvider, IToolbarButton, ConfigService, HostAppService, ElectronService } from 'terminus-core'

import { TerminalService } from './services/terminal.service'

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private terminal: TerminalService,
        private config: ConfigService,
        hostApp: HostAppService,
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
        let shells = await this.terminal.shells$.pipe(first()).toPromise()
        let shell = shells.find(x => x.id === this.config.store.terminal.shell)
        this.terminal.openTab(shell, cwd)
    }

    provide (): IToolbarButton[] {
        return [{
            icon: 'plus',
            title: 'New terminal',
            touchBarTitle: 'New',
            click: async () => {
                this.openNewTab()
            }
        }]
    }
}
