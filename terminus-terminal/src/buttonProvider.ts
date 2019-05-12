import * as fs from 'mz/fs'
import { Injectable } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { HotkeysService, ToolbarButtonProvider, IToolbarButton, HostAppService, ElectronService } from 'terminus-core'

import { TerminalService } from './services/terminal.service'

/** @hidden */
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
        if (!electron.remote.process.env.TERMINUS_DEV) {
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
        return [
            {
                icon: this.domSanitizer.bypassSecurityTrustHtml(require('./icons/plus.svg')),
                title: 'New terminal',
                touchBarNSImage: 'NSTouchBarAddDetailTemplate',
                click: async () => {
                    this.terminal.openTab()
                }
            },
            {
                icon: this.domSanitizer.bypassSecurityTrustHtml(require('./icons/profiles.svg')),
                title: 'New terminal with profile',
                submenu: async () => {
                    let profiles = await this.terminal.getProfiles()
                    return profiles.map(profile => ({
                        icon: null,
                        title: profile.name,
                        click: () => this.terminal.openTab(profile),
                    }))
                }
            },
        ]
    }
}
