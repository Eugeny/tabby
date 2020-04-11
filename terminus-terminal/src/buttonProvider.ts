/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as fs from 'mz/fs'
import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, ElectronService, ConfigService, SelectorOption, AppService } from 'terminus-core'

import { TerminalService } from './services/terminal.service'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        electron: ElectronService,
        private app: AppService,
        private config: ConfigService,
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

    async activate () {
        const options: SelectorOption<void>[] = []
        const profiles = await this.terminal.getProfiles({ skipDefault: !this.config.store.terminal.showDefaultProfiles })

        for (const profile of profiles) {
            options.push({
                icon: profile.icon,
                name: profile.name,
                callback: () => this.terminal.openTab(profile),
            })
        }

        await this.app.showSelector('Select profile', options)
    }

    provide (): ToolbarButton[] {
        return [
            {
                icon: require('./icons/plus.svg'),
                title: 'New terminal',
                touchBarNSImage: 'NSTouchBarAddDetailTemplate',
                click: () => {
                    this.terminal.openTab()
                },
            },
            {
                icon: require('./icons/profiles.svg'),
                title: 'New terminal with profile',
                click: () => this.activate(),
            },
        ]
    }
}
