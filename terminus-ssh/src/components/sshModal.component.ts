import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastrService } from 'ngx-toastr'
import { ConfigService, AppService } from 'terminus-core'
import { SettingsTabComponent } from 'terminus-settings'
import { SSHService } from '../services/ssh.service'
import { SSHConnection } from '../api'

@Component({
    template: require('./sshModal.component.pug'),
    //styles: [require('./sshModal.component.scss')],
})
export class SSHModalComponent {
    connections: SSHConnection[]
    quickTarget: string
    lastConnection: SSHConnection

    constructor (
        public modalInstance: NgbActiveModal,
        private config: ConfigService,
        private ssh: SSHService,
        private app: AppService,
        private toastr: ToastrService,
    ) { }

    ngOnInit () {
        this.connections = this.config.store.ssh.connections
        if (window.localStorage.lastConnection) {
            this.lastConnection = JSON.parse(window.localStorage.lastConnection)
        }
    }

    quickConnect () {
        let user = 'root'
        let host = this.quickTarget
        if (host.includes('@')) {
            [user, host] = host.split('@')
        }
        let connection: SSHConnection = {
            name: this.quickTarget,
            host, user,
        }
        window.localStorage.lastConnection = JSON.stringify(connection)
        this.connect(connection)
    }

    connect (connection: SSHConnection) {
        this.close()
        this.ssh.connect(connection).catch(error => {
            this.toastr.error(`Could not connect: ${error}`)
        })
    }

    manageConnections () {
        this.close()
        this.app.openNewTab(SettingsTabComponent, { activeTab: 'ssh' })
    }

    close () {
        this.modalInstance.close()
    }
}
