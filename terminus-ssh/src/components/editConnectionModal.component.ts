import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ElectronService, HostAppService } from 'terminus-core'
import { SSHConnection, LoginScript } from '../api'

@Component({
    template: require('./editConnectionModal.component.pug'),
})
export class EditConnectionModalComponent {
    connection: SSHConnection
    newScript: LoginScript

    constructor (
        private modalInstance: NgbActiveModal,
        private electron: ElectronService,
        private hostApp: HostAppService,
    ) {
        this.newScript = { expect: '', send: '' }
    }

    selectPrivateKey () {
        let path = this.electron.dialog.showOpenDialog(
            this.hostApp.getWindow(),
            {
                title: 'Select private key',
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

    moveScriptUp (script: LoginScript) {
        let index = this.connection.scripts.indexOf(script)
        if (index > 0) {
            this.connection.scripts.splice(index, 1)
            this.connection.scripts.splice(index - 1, 0, script)
        }
    }

    moveScriptDown (script: LoginScript) {
        let index = this.connection.scripts.indexOf(script)
        if (index >= 0 && index < this.connection.scripts.length - 1) {
            this.connection.scripts.splice(index, 1)
            this.connection.scripts.splice(index + 1, 0, script)
        }
    }

    deleteScript (script: LoginScript) {
        if (confirm(`Delete?`)) {
            this.connection.scripts = this.connection.scripts.filter(x => x !== script)
        }
    }

    addScript () {
        if (!this.connection.scripts) {
            this.connection.scripts = []
        }
        this.connection.scripts.push({...this.newScript})
        this.clearScript()
    }

    clearScript () {
        this.newScript.expect = ''
        this.newScript.send = ''
    }
}
