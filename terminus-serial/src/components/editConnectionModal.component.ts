/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { Observable } from 'rxjs'
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators'
import { ElectronService, HostAppService } from 'terminus-core'
import { SerialConnection, LoginScript, SerialPortInfo, BAUD_RATES } from '../api'
import { SerialService } from '../services/serial.service'

/** @hidden */
@Component({
    template: require('./editConnectionModal.component.pug'),
})
export class EditConnectionModalComponent {
    connection: SerialConnection
    foundPorts: SerialPortInfo[]
    inputModes = [
        { key: null, name: 'Normal', description: 'Input is sent as you type' },
        { key: 'readline', name: 'Line by line', description: 'Line editor, input is sent after you press Enter' },
        { key: 'readline-hex', name: 'Hexadecimal', description: 'Send bytes by typing in hex values' },
    ]
    outputModes = [
        { key: null, name: 'Normal', description: 'Output is shown as it is received' },
        { key: 'hex', name: 'Hexadecimal', description: 'Output is shown as a hexdump' },
    ]
    newlineModes = [
        { key: null, name: 'Keep' },
        { key: 'strip', name: 'Strip' },
        { key: 'cr', name: 'Force CR' },
        { key: 'lf', name: 'Force LF' },
        { key: 'crlf', name: 'Force CRLF' },
    ]

    constructor (
        private modalInstance: NgbActiveModal,
        private electron: ElectronService,
        private hostApp: HostAppService,
        private serial: SerialService,
    ) {
    }

    getInputModeName (key) {
        return this.inputModes.find(x => x.key === key)?.name
    }

    getOutputModeName (key) {
        return this.outputModes.find(x => x.key === key)?.name
    }

    portsAutocomplete = text$ => text$.pipe(map(() => {
        return this.foundPorts.map(x => x.name)
    }))

    baudratesAutocomplete = text$ => text$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        map(q => BAUD_RATES.filter(x => !q || x.toString().startsWith(q)))
    )

    portsFormatter = port => {
        const p = this.foundPorts.find(x => x.name === port)
        if (p?.description) {
            return `${port} (${p.description})`
        }
        return port
    }

    async ngOnInit () {
        this.connection.scripts = this.connection.scripts ?? []
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
