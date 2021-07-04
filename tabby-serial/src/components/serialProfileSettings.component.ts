/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators'
import { PlatformService, ProfileSettingsComponent } from 'tabby-core'
import { LoginScript, SerialPortInfo, BAUD_RATES, SerialProfile } from '../api'
import { SerialService } from '../services/serial.service'

/** @hidden */
@Component({
    template: require('./serialProfileSettings.component.pug'),
})
export class SerialProfileSettingsComponent implements ProfileSettingsComponent {
    profile: SerialProfile
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
        private platform: PlatformService,
        private serial: SerialService,
    ) { }

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
        map((q: string) => BAUD_RATES.filter(x => !q || x.toString().startsWith(q)))
    )

    portsFormatter = port => {
        const p = this.foundPorts.find(x => x.name === port)
        if (p?.description) {
            return `${port} (${p.description})`
        }
        return port
    }

    async ngOnInit () {
        this.profile.options.scripts = this.profile.options.scripts ?? []
        this.foundPorts = await this.serial.listPorts()
    }

    moveScriptUp (script: LoginScript) {
        if (!this.profile.options.scripts) {
            this.profile.options.scripts = []
        }
        const index = this.profile.options.scripts.indexOf(script)
        if (index > 0) {
            this.profile.options.scripts.splice(index, 1)
            this.profile.options.scripts.splice(index - 1, 0, script)
        }
    }

    moveScriptDown (script: LoginScript) {
        if (!this.profile.options.scripts) {
            this.profile.options.scripts = []
        }
        const index = this.profile.options.scripts.indexOf(script)
        if (index >= 0 && index < this.profile.options.scripts.length - 1) {
            this.profile.options.scripts.splice(index, 1)
            this.profile.options.scripts.splice(index + 1, 0, script)
        }
    }

    async deleteScript (script: LoginScript) {
        if (this.profile.options.scripts && (await this.platform.showMessageBox(
            {
                type: 'warning',
                message: 'Delete this script?',
                detail: script.expect,
                buttons: ['Keep', 'Delete'],
                defaultId: 1,
            }
        )).response === 1) {
            this.profile.options.scripts = this.profile.options.scripts.filter(x => x !== script)
        }
    }

    addScript () {
        if (!this.profile.options.scripts) {
            this.profile.options.scripts = []
        }
        this.profile.options.scripts.push({ expect: '', send: '' })
    }
}
