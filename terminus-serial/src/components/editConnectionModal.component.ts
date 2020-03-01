/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { map } from 'rxjs/operators'
import { ElectronService, HostAppService } from 'terminus-core'
import { SerialConnection, LoginScript, SerialPortInfo, BAUD_RATES } from '../api'
import { SerialService } from '../services/serial.service'
// import { PromptModalComponent } from './promptModal.component'

/** @hidden */
@Component({
    template: require('./editConnectionModal.component.pug'),
})
export class EditConnectionModalComponent {
    connection: SerialConnection
    foundPorts: SerialPortInfo[]
    baudRates = BAUD_RATES

    constructor (
        private modalInstance: NgbActiveModal,
        private electron: ElectronService,
        private hostApp: HostAppService,
        private serial: SerialService,
    ) {
    }

    portsAutocomplete = text$ => text$.pipe(map(() => {
        return this.foundPorts.map(x => x.name)
    }))

    portsFormatter = port => {
        const p = this.foundPorts.find(x => x.name === port)
        if (p?.description) {
            return `${port} (${p.description})`
        }
        return port
    }

    async ngOnInit () {
        this.connection.scripts = this.connection.scripts || []
        this.foundPorts = await this.serial.listPorts()
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
