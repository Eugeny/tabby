import { Injectable } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { HotkeysService, ToolbarButtonProvider, IToolbarButton } from 'terminus-core'
import { SSHModalComponent } from './components/sshModal.component'

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private ngbModal: NgbModal,
        private domSanitizer: DomSanitizer,
        hotkeys: HotkeysService,
    ) {
        super()
        hotkeys.matchedHotkey.subscribe(async (hotkey) => {
            if (hotkey === 'ssh') {
                this.activate()
            }
        })
    }

    activate () {
        this.ngbModal.open(SSHModalComponent)
    }

    provide (): IToolbarButton[] {
        return [{
            icon: this.domSanitizer.bypassSecurityTrustHtml(require('./icons/globe.svg')),
            weight: 5,
            title: 'SSH connections',
            touchBarNSImage: 'NSTouchBarOpenInBrowserTemplate',
            click: async () => {
                this.activate()
            }
        }]
    }
}
