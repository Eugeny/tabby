/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { HotkeysService, ToolbarButtonProvider, ToolbarButton, HostAppService, Platform } from 'tabby-core'
import { SSHService } from './services/ssh.service'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        hotkeys: HotkeysService,
        private hostApp: HostAppService,
        private ssh: SSHService,
    ) {
        super()
        hotkeys.matchedHotkey.subscribe(async (hotkey: string) => {
            if (hotkey === 'ssh') {
                this.activate()
            }
        })
    }

    activate () {
        this.ssh.showConnectionSelector()
    }

    provide (): ToolbarButton[] {
        if (this.hostApp.platform === Platform.Web) {
            return [{
                icon: require('../../tabby-local/src/icons/plus.svg'),
                title: 'SSH connections',
                click: () => this.activate(),
            }]
        } else {
            return [{
                icon: require('./icons/globe.svg'),
                weight: 5,
                title: 'SSH connections',
                touchBarNSImage: 'NSTouchBarOpenInBrowserTemplate',
                click: () => this.activate(),
            }]
        }
    }
}
