/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { debounceTime, distinctUntilChanged, map } from 'rxjs'
import { HostAppService, Platform, ProfileSettingsComponent } from 'tabby-core'
import { SerialPortInfo, BAUD_RATES, SerialProfile } from '../api'
import { SerialService } from '../services/serial.service'

/** @hidden */
@Component({
    template: require('./serialProfileSettings.component.pug'),
})
export class SerialProfileSettingsComponent implements ProfileSettingsComponent<SerialProfile> {
    profile: SerialProfile
    foundPorts: SerialPortInfo[]
    Platform = Platform

    constructor (
        private serial: SerialService,
        public hostApp: HostAppService,
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
        this.foundPorts = await this.serial.listPorts()
    }
}
