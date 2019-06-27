import { Injectable } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { HotkeysService, ToolbarButtonProvider, ToolbarButton } from 'terminus-core'
import { SSHModalComponent } from './components/sshModal.component'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private ngbModal: NgbModal,
        private domSanitizer: DomSanitizer,
        hotkeys: HotkeysService,
    ) {
        super()
        hotkeys.matchedHotkey.subscribe(async (hotkey: string) => {
            if (hotkey === 'ssh') {
                this.activate()
            }
        })
    }

    activate () {
        this.ngbModal.open(SSHModalComponent)
    }

    provide (): ToolbarButton[] {
        return [{
            icon: this.domSanitizer.bypassSecurityTrustHtml(require('./icons/globe.svg')),
            weight: 5,
            title: 'SSH connections',
            touchBarNSImage: 'NSTouchBarOpenInBrowserTemplate',
            click: async () => {
                this.activate()
            },
        }]
    }
}
