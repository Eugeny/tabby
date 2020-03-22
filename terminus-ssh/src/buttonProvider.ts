/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { HotkeysService, ToolbarButtonProvider, ToolbarButton } from 'terminus-core'
import { SSHService } from './services/ssh.service'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        hotkeys: HotkeysService,
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
        return [{
            icon: require('./icons/globe.svg'),
            weight: 5,
            title: 'SSH connections',
            touchBarNSImage: 'NSTouchBarOpenInBrowserTemplate',
            click: async () => {
                this.activate()
            },
        }]
    }
}
