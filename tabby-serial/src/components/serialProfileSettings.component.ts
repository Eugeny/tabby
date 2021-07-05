/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component } from '@angular/core'
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators'
import { ProfileSettingsComponent } from 'tabby-core'
import { SerialPortInfo, BAUD_RATES, SerialProfile } from '../api'
import { SerialService } from '../services/serial.service'

/** @hidden */
@Component({
    template: require('./serialProfileSettings.component.pug'),
})
export class SerialProfileSettingsComponent implements ProfileSettingsComponent {
    profile: SerialProfile
    foundPorts: SerialPortInfo[]

    constructor (
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
        this.foundPorts = await this.serial.listPorts()
    }
}
