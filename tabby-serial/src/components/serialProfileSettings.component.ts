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

    constructor (
        private platform: PlatformService,
        private serial: SerialService,
    ) { }

    portsAutocomplete = text$ => text$.pipe(map(() => {
        return this.foundPorts.map(x => x.name)
    }))

    baudratesAutocomplete = text$ => text$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        map((q: string) => [
            null,
            ...BAUD_RATES.filter(x => !q || x.toString().startsWith(q)),
        ])
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
