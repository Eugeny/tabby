import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastrService } from 'ngx-toastr'
import { ConfigService, AppService } from 'terminus-core'
import { SettingsTabComponent } from 'terminus-settings'
import { SSHService } from '../services/ssh.service'
import { SSHConnection, ISSHConnectionGroup } from '../api'

/** @hidden */
@Component({
    template: require('./sshModal.component.pug'),
    styles: [require('./sshModal.component.scss')],
})
export class SSHModalComponent {
    connections: SSHConnection[]
    childFolders: ISSHConnectionGroup[]
    quickTarget: string
    lastConnection: SSHConnection
    childGroups: ISSHConnectionGroup[]
    groupCollapsed: {[id: string]: boolean} = {}

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
        this.refresh()
    }

    quickConnect () {
        let user = 'root'
        let host = this.quickTarget
        let port = 22
        if (host.includes('@')) {
            [user, host] = host.split('@')
        }
        if (host.includes(':')) {
            port = parseInt(host.split(':')[1])
            host = host.split(':')[0]
        }

        let connection: SSHConnection = {
            name: this.quickTarget,
            host, user, port
        }
        window.localStorage.lastConnection = JSON.stringify(connection)
        this.connect(connection)
    }

    clearLastConnection () {
        window.localStorage.lastConnection = null
        this.lastConnection = null
    }

    connect (connection: SSHConnection) {
        this.close()
        this.ssh.openTab(connection).catch(error => {
            this.toastr.error(`Could not connect: ${error}`)
        }).then(() => {
            setTimeout(() => {
                this.app.activeTab.emitFocused()
            })
        })
    }

    manageConnections () {
        this.close()
        this.app.openNewTab(SettingsTabComponent, { activeTab: 'ssh' })
    }

    close () {
        this.modalInstance.close()
    }

    refresh () {
        this.childGroups = []

        let connections = this.connections
        if (this.quickTarget) {
            connections = connections.filter(connection => (connection.name + connection.group).toLowerCase().includes(this.quickTarget))
        }

        for (let connection of connections) {
            connection.group = connection.group || null
            let group = this.childGroups.find(x => x.name === connection.group)
            if (!group) {
                group = {
                    name: connection.group,
                    connections: [],
                }
                this.childGroups.push(group)
            }
            group.connections.push(connection)
        }
    }
}
