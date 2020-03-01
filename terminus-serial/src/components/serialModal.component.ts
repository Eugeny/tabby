import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastrService } from 'ngx-toastr'
import { ConfigService, AppService } from 'terminus-core'
import { SettingsTabComponent } from 'terminus-settings'
import { SerialService } from '../services/serial.service'
import { SerialConnection, SerialConnectionGroup, SerialPortInfo, BAUD_RATES } from '../api'

/** @hidden */
@Component({
    template: require('./serialModal.component.pug'),
    styles: [require('./serialModal.component.scss')],
})
export class SerialModalComponent {
    connections: SerialConnection[]
    childFolders: SerialConnectionGroup[]
    quickTarget: string
    lastConnection: SerialConnection|null = null
    childGroups: SerialConnectionGroup[]
    groupCollapsed: {[id: string]: boolean} = {}
    foundPorts: SerialPortInfo[] = []

    constructor (
        public modalInstance: NgbActiveModal,
        private config: ConfigService,
        private serial: SerialService,
        private app: AppService,
        private toastr: ToastrService,
    ) { }

    async ngOnInit () {
        this.connections = this.config.store.serial.connections
        if (window.localStorage.lastSerialConnection) {
            this.lastConnection = JSON.parse(window.localStorage.lastSerialConnection)
        }
        this.refresh()

        this.foundPorts = await this.serial.listPorts()
    }

    quickConnect () {
        let path = this.quickTarget
        let baudrate = 115200
        if (this.quickTarget.includes('@')) {
            baudrate = parseInt(path.split('@')[1])
            path = path.split('@')[0]
        }
        const connection: SerialConnection = {
            name: this.quickTarget,
            group: null,
            port: path,
            baudrate: baudrate,
            databits: 8,
            parity: 'none',
            rtscts: false,
            stopbits: 1,
            xany: false,
            xoff: false,
            xon: false,
        }
        window.localStorage.lastSerialConnection = JSON.stringify(connection)
        this.connect(connection)
    }

    clearLastConnection () {
        window.localStorage.lastSerialConnection = null
        this.lastConnection = null
    }

    connect (connection: SerialConnection) {
        this.close()
        this.serial.openTab(connection).catch(error => {
            this.toastr.error(`Could not connect: ${error}`)
        }).then(() => {
            setTimeout(() => {
                this.app.activeTab.emitFocused()
            })
        })
    }

    manageConnections () {
        this.close()
        this.app.openNewTab(SettingsTabComponent, { activeTab: 'serial' })
    }

    close () {
        this.modalInstance.close()
    }

    refresh () {
        this.childGroups = []

        let connections = this.connections
        if (this.quickTarget) {
            connections = connections.filter((connection: SerialConnection) => (connection.name + connection.group!).toLowerCase().includes(this.quickTarget))
        }

        for (const connection of connections) {
            connection.group = connection.group || null
            let group = this.childGroups.find(x => x.name === connection.group)
            if (!group) {
                group = {
                    name: connection.group!,
                    connections: [],
                }
                this.childGroups.push(group!)
            }
            group.connections.push(connection)
        }
    }

    async connectFoundPort (port: SerialPortInfo) {
        const rate = await this.app.showSelector('Baud rate', BAUD_RATES.map(x => ({
            name: x.toString(), result: x,
        })))
        this.quickTarget = `${port.name}@${rate}`
        this.quickConnect()
    }
}
