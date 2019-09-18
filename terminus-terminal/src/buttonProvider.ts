import * as fs from 'mz/fs'
import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, ElectronService } from 'terminus-core'

import { TerminalService } from './services/terminal.service'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        electron: ElectronService,
        private terminal: TerminalService,
    ) {
        super()
        if (!electron.remote.process.env.TERMINUS_DEV) {
            setImmediate(async () => {
                const argv: string[] = electron.remote.process.argv
                for (const arg of argv.slice(1).concat([electron.remote.process.argv0])) {
                    if (await fs.exists(arg)) {
                        if ((await fs.stat(arg)).isDirectory()) {
                            this.terminal.openTab(undefined, arg)
                        }
                    }
                }
            })
        }
    }

    provide (): ToolbarButton[] {
        return [
            {
                icon: require('./icons/plus.svg'),
                title: 'New terminal',
                touchBarNSImage: 'NSTouchBarAddDetailTemplate',
                click: async () => {
                    this.terminal.openTab()
                },
            },
            {
                icon: require('./icons/profiles.svg'),
                title: 'New terminal with profile',
                submenu: async () => {
                    const profiles = await this.terminal.getProfiles()
                    return profiles.map(profile => ({
                        icon: profile.icon,
                        title: profile.name,
                        click: () => this.terminal.openTab(profile),
                    }))
                },
            },
        ]
    }
}
