import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, ElectronService, HostAppService } from 'terminus-core'
import { SSHConnection, ISSHConnectionGroup } from '../api'
import { EditConnectionModalComponent } from './editConnectionModal.component'
import { PromptModalComponent } from './promptModal.component'

/** @hidden */
@Component({
    template: require('./sshSettingsTab.component.pug'),
})
export class SSHSettingsTabComponent {
    connections: SSHConnection[]
    childGroups: ISSHConnectionGroup[]
    groupCollapsed: {[id: string]: boolean} = {}

    constructor (
        public config: ConfigService,
        private electron: ElectronService,
        private hostApp: HostAppService,
        private ngbModal: NgbModal,
    ) {
        this.connections = this.config.store.ssh.connections
        this.refresh()
    }

    createConnection () {
        let connection: SSHConnection = {
            name: '',
            host: '',
            port: 22,
            user: 'root',
        }

        let modal = this.ngbModal.open(EditConnectionModalComponent)
        modal.componentInstance.connection = connection
        modal.result.then(result => {
            this.connections.push(result)
            this.config.store.ssh.connections = this.connections
            this.config.save()
            this.refresh()
        })
    }

    editConnection (connection: SSHConnection) {
        let modal = this.ngbModal.open(EditConnectionModalComponent)
        modal.componentInstance.connection = Object.assign({}, connection)
        modal.result.then(result => {
            Object.assign(connection, result)
            this.config.store.ssh.connections = this.connections
            this.config.save()
            this.refresh()
        })
    }

    async deleteConnection (connection: SSHConnection) {
        if ((await this.electron.showMessageBox(
            this.hostApp.getWindow(),
            {
                type: 'warning',
                message: `Delete "${connection.name}"?`,
                buttons: ['Keep', 'Delete'],
                defaultId: 1,
            }
        )).response === 1) {
            this.connections = this.connections.filter(x => x !== connection)
            this.config.store.ssh.connections = this.connections
            this.config.save()
            this.refresh()
        }
    }

    editGroup (group: ISSHConnectionGroup) {
        let modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = 'New group name'
        modal.componentInstance.value = group.name
        modal.result.then(result => {
            if (result) {
                for (let connection of this.connections.filter(x => x.group === group.name)) {
                    connection.group = result
                }
                this.config.store.ssh.connections = this.connections
                this.config.save()
                this.refresh()
            }
        })
    }

    async deleteGroup (group: ISSHConnectionGroup) {
        if ((await this.electron.showMessageBox(
            this.hostApp.getWindow(),
            {
                type: 'warning',
                message: `Delete "${group}"?`,
                buttons: ['Keep', 'Delete'],
                defaultId: 1,
            }
        )).response === 1) {
            for (let connection of this.connections.filter(x => x.group === group.name)) {
                connection.group = null
            }
            this.config.save()
            this.refresh()
        }
    }

    refresh () {
        this.connections = this.config.store.ssh.connections
        this.childGroups = []

        for (let connection of this.connections) {
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
