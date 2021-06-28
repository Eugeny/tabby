/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, ConfigService, SelectorOption, SelectorService } from 'terminus-core'
import { ElectronService } from 'terminus-electron'

import { TerminalService } from './services/terminal.service'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        electron: ElectronService,
        private selector: SelectorService,
        private config: ConfigService,
        private terminal: TerminalService,
    ) {
        super()
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

        await this.selector.show('Select profile', options)
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
