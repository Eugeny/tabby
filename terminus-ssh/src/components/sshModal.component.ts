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
    currentPath: string
    childFolders: string[]
    childConnections: SSHConnection[]

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
        this.currentPath = "/"
        this.findChildren()
    }

    filter () {
        if (!this.quickTarget) {
            this.findChildren()
        }
        else
        {
            this.childFolders = [];
            this.childConnections = this.connections.filter(connection => connection.name.toLowerCase().indexOf(this.quickTarget) >= 0)
        }
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

    findChildren () {
        this.childFolders = []
        this.childConnections = []

        if (this.currentPath != "/")
            this.childFolders.push("..")

        for (let connection of this.connections) {
            if (!connection.path)
                connection.path = "/"
            if (connection.path.startsWith(this.currentPath)) {
                let folder = connection.path.substr(this.currentPath.length, connection.path.indexOf("/", this.currentPath.length) - this.currentPath.length)
                if (folder.length == 0) {
                    this.childConnections.push(connection)
                }
                else if (this.childFolders.indexOf(folder) < 0) {
                    this.childFolders.push(folder)
                }
            }
        }
    }

    cd (path: string) {
        if (path == "..") {
            path = this.currentPath.substr(0, this.currentPath.lastIndexOf("/", this.currentPath.length - 2) + 1)
        }
        else {
            path = this.currentPath + path + '/'
        }

        this.currentPath = path
        this.findChildren()
    }
}
