/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { HotkeysService, ToolbarButtonProvider, ToolbarButton } from 'terminus-core'
import { SerialModalComponent } from './components/serialModal.component'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private ngbModal: NgbModal,
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
        this.ngbModal.open(SerialModalComponent)
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
