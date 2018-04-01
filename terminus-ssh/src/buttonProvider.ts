import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { HotkeysService, ToolbarButtonProvider, IToolbarButton } from 'terminus-core'
import { SSHModalComponent } from './components/sshModal.component'

@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private ngbModal: NgbModal,
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
            icon: 'globe',
            weight: 5,
            title: 'SSH connections',
            touchBarTitle: 'SSH',
            click: async () => {
                this.activate()
            }
        }]
    }
}
