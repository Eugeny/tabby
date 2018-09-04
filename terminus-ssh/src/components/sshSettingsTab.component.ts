import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService } from 'terminus-core'
import { SSHConnection } from '../api'
import { EditConnectionModalComponent } from './editConnectionModal.component'
import { PromptModalComponent } from './promptModal.component'

@Component({
    template: require('./sshSettingsTab.component.pug'),
})
export class SSHSettingsTabComponent {
    connections: SSHConnection[]
    currentPath: string
    childFolders: string[]
    childConnections: SSHConnection[]

    constructor (
        public config: ConfigService,
        private ngbModal: NgbModal,
    ) {
        this.connections = this.config.store.ssh.connections
        this.currentPath = "/"
        this.findChildren()
    }

    createConnection () {
        let connection: SSHConnection = {
            name: '',
            host: '',
            port: 22,
            user: 'root',
            path: this.currentPath
        }

        let modal = this.ngbModal.open(EditConnectionModalComponent)
        modal.componentInstance.connection = connection
        modal.result.then(result => {
            this.connections.push(result)
            this.config.store.ssh.connections = this.connections
            this.config.save()
            this.childConnections.push(result)
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
            this.childConnections = this.connections.filter(x => x !== connection)
        }
    }
    
    createFolder () {
        let modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = 'folder name'
        modal.componentInstance.password = false
        modal.result.then(result => {
            if (result) {
                if (!this.childFolders.includes(result)) {
                    this.childFolders.push(result)
                }
            }
        })
    }

    editFolder (folder: string) {
        let modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = 'folder name'
        modal.componentInstance.password = false
        modal.componentInstance.value = folder
        modal.result.then(result => {
            if (result) {
                let oldPath = this.currentPath + folder + "/"
                let newPath = this.currentPath + result + "/"
                for (let connection of this.connections) {
                    connection.path = connection.path.replace(oldPath, newPath)
                }
                let i = this.childFolders.indexOf(folder)
                if (this.childFolders.includes(result)) {
                    this.childFolders.splice(i, 1)
                }
                else {
                    this.childFolders.splice(i, 1, result)
                }
                this.config.save()
            }
        }) 
    }

    deleteFolder (folder: string) {
        if (confirm(`Delete "${folder}"?`)) {
            let oldPath = this.currentPath + folder + "/"
            for (let connection of this.connections) {
                connection.path = connection.path.replace(oldPath, this.currentPath)
            }
            this.config.save()
            this.findChildren()
        }
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
