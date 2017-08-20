import { AsyncSubject } from 'rxjs'
import * as fs from 'mz/fs'
import * as path from 'path'
import { Injectable, Inject } from '@angular/core'
import { HotkeysService, ToolbarButtonProvider, IToolbarButton, ConfigService, HostAppService, ElectronService, Logger, LogService } from 'terminus-core'

import { IShell, ShellProvider } from './api'
import { TerminalService } from './services/terminal.service'

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    private shells$ = new AsyncSubject<IShell[]>()
    private logger: Logger

    constructor (
        private terminal: TerminalService,
        private config: ConfigService,
        log: LogService,
        hostApp: HostAppService,
        @Inject(ShellProvider) shellProviders: ShellProvider[],
        electron: ElectronService,
        hotkeys: HotkeysService,
    ) {
        super()
        this.logger = log.create('newTerminalButton')
        Promise.all(shellProviders.map(x => x.provide())).then(shellLists => {
            this.shells$.next(shellLists.reduce((a, b) => a.concat(b)))
            this.shells$.complete()
        })
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
        let shells = await this.shells$.first().toPromise()
        let shell = shells.find(x => x.id === this.config.store.terminal.shell) || shells[0]
        this.terminal.openTab(shell, cwd)
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
