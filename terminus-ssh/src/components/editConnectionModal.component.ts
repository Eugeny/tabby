import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ElectronService, HostAppService } from 'terminus-core'
import { SSHConnection } from '../api'

@Component({
    template: require('./editConnectionModal.component.pug'),
})
export class EditConnectionModalComponent {
    connection: SSHConnection

    constructor (
        private modalInstance: NgbActiveModal,
        private electron: ElectronService,
        private hostApp: HostAppService,
    ) { }

    selectPrivateKey () {
        let path = this.electron.dialog.showOpenDialog(
            this.hostApp.getWindow(),
            {
                title: 'Select private key',
                properties: ['openDirectory']
            }
        )
        if (path) {
            this.connection.privateKey = path[0]
        }
    }

    save () {
        this.modalInstance.close(this.connection)
    }

    cancel () {
        this.modalInstance.dismiss()
    }
}
