/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Component } from '@angular/core'
import { debounceTime, distinctUntilChanged, map } from 'rxjs'
import { FullyDefined, HostAppService, Platform, ProfileSettingsComponent, TranslateService } from 'tabby-core'
import { SerialPortInfo, BAUD_RATES, SerialProfile } from '../api'
import { SerialService } from '../services/serial.service'
import { SerialProfilesService } from '../profiles'

/** @hidden */
@Component({
    templateUrl: './serialProfileSettings.component.pug',
})
export class SerialProfileSettingsComponent implements ProfileSettingsComponent<SerialProfile, SerialProfilesService> {
    profile: FullyDefined<SerialProfile>
    foundPorts: SerialPortInfo[]
    Platform = Platform
    parityOptions: { value: any, name: string }[] = []

    constructor (
        private serial: SerialService,
        public hostApp: HostAppService,
        translate: TranslateService,
    ) {
        this.parityOptions = [
            { value: 'none', name: translate.instant(_('None')) },
            { value: 'even', name: 'Even' },
            { value: 'odd', name: 'Odd' },
        ]
        if (hostApp.platform === Platform.Windows) {
            this.parityOptions.push(
                { value: 'mark', name: 'Mark' },
                { value: 'space', name: 'Space' },
            )
        }
    }

    portsAutocomplete = text$ => text$.pipe(map(() => {
        return this.foundPorts.map(x => x.name)
    }))

    baudratesAutocomplete = text$ => text$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        map((q: string) => [
            null,
            ...BAUD_RATES.filter(x => !q || x.toString().startsWith(q)),
        ]),
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
