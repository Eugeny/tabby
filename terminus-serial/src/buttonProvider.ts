/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable, Injector } from '@angular/core'
import { HotkeysService, ToolbarButtonProvider, ToolbarButton } from 'terminus-core'
import { SerialService } from './services/serial.service'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private injector: Injector,
        hotkeys: HotkeysService,
    ) {
        super()
        hotkeys.matchedHotkey.subscribe(async (hotkey: string) => {
            if (hotkey === 'serial') {
                this.activate()
            }
        })
    }

    activate () {
        this.injector.get(SerialService).showConnectionSelector()
    }

    provide (): ToolbarButton[] {
        return [{
            icon: require('./icons/serial.svg'),
            weight: 5,
            title: 'Serial connections',
            touchBarNSImage: 'NSTouchBarOpenInBrowserTemplate',
            click: async () => {
                this.activate()
            },
        }]
    }
}
