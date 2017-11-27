import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService } from 'terminus-core'
import { SSHConnection } from '../api'
import { EditConnectionModalComponent } from './editConnectionModal.component'

@Component({
    template: require('./sshSettingsTab.component.pug'),
})
export class SSHSettingsTabComponent {
    connections: SSHConnection[]

    constructor (
        public config: ConfigService,
        private ngbModal: NgbModal,
    ) {
        this.connections = this.config.store.ssh.connections
    }

    createConnection () {
        let connection: SSHConnection = {
            name: '',
            host: '',
            user: 'root',
        }
        let modal = this.ngbModal.open(EditConnectionModalComponent)
        modal.componentInstance.connection = connection
        modal.result.then(result => {
            this.connections.push(result)
            this.config.store.ssh.connections = this.connections
            this.config.save()
        })
    }

    editConnection (connection: SSHConnection) {
        let modal = this.ngbModal.open(EditConnectionModalComponent)
        modal.componentInstance.connection = Object.assign({}, connection)
        modal.result.then(result => {
            Object.assign(connection, result)
            this.config.save()
        })
    }

    deleteConnection (connection: SSHConnection) {
        if (confirm(`Delete "${connection.name}"?`)) {
            this.connections = this.connections.filter(x => x !== connection)
            this.config.store.ssh.connections = this.connections
            this.config.save()
        }
    }
}
