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
        let modal = this.ngbModal.open(SSHModalComponent)
        modal.result.then(() => {
            //this.terminal.openTab(shell)
        })
    }

    provide (): IToolbarButton[] {
        return [{
            icon: 'globe',
            weight: 5,
            title: 'SSH connections',
            click: async () => {
                this.activate()
            }
        }]
    }
}
