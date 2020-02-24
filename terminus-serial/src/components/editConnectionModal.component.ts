import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ElectronService, HostAppService } from 'terminus-core'
import { SerialConnection, LoginScript } from '../api'
// import { PromptModalComponent } from './promptModal.component'

/** @hidden */
@Component({
    template: require('./editConnectionModal.component.pug'),
})
export class EditConnectionModalComponent {
    connection: SerialConnection

    constructor (
        private modalInstance: NgbActiveModal,
        private electron: ElectronService,
        private hostApp: HostAppService,
        // private ngbModal: NgbModal,
    ) {
    }

    async ngOnInit () {
        this.connection.scripts = this.connection.scripts || []
    }

    save () {
        this.modalInstance.close(this.connection)
    }

    cancel () {
        this.modalInstance.dismiss()
    }

    moveScriptUp (script: LoginScript) {
        if (!this.connection.scripts) {
            this.connection.scripts = []
        }
        const index = this.connection.scripts.indexOf(script)
        if (index > 0) {
            this.connection.scripts.splice(index, 1)
            this.connection.scripts.splice(index - 1, 0, script)
        }
    }

    moveScriptDown (script: LoginScript) {
        if (!this.connection.scripts) {
            this.connection.scripts = []
        }
        const index = this.connection.scripts.indexOf(script)
        if (index >= 0 && index < this.connection.scripts.length - 1) {
            this.connection.scripts.splice(index, 1)
            this.connection.scripts.splice(index + 1, 0, script)
        }
    }

    async deleteScript (script: LoginScript) {
        if (this.connection.scripts && (await this.electron.showMessageBox(
            this.hostApp.getWindow(),
            {
                type: 'warning',
                message: 'Delete this script?',
                detail: script.expect,
                buttons: ['Keep', 'Delete'],
                defaultId: 1,
            }
        )).response === 1) {
            this.connection.scripts = this.connection.scripts.filter(x => x !== script)
        }
    }

    addScript () {
        if (!this.connection.scripts) {
            this.connection.scripts = []
        }
        this.connection.scripts.push({ expect: '', send: '' })
    }
}
