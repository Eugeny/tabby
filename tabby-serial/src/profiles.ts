import slugify from 'slugify'
import deepClone from 'clone-deep'
import { Injectable } from '@angular/core'
import { ProfileProvider, NewTabParameters, SelectorService } from 'tabby-core'
import { InputMode, NewlineMode } from 'tabby-terminal'
import { SerialProfileSettingsComponent } from './components/serialProfileSettings.component'
import { SerialTabComponent } from './components/serialTab.component'
import { SerialService } from './services/serial.service'
import { BAUD_RATES, SerialProfile } from './api'

@Injectable({ providedIn: 'root' })
export class SerialProfilesService extends ProfileProvider {
    id = 'serial'
    name = 'Serial'
    settingsComponent = SerialProfileSettingsComponent

    constructor (
        private selector: SelectorService,
        private serial: SerialService,
    ) { super() }

    async getBuiltinProfiles (): Promise<SerialProfile[]> {
        return [
            {
                id: `serial:template`,
                type: 'serial',
                name: 'Serial connection',
                icon: 'fas fa-microchip',
                options: {
                    port: '',
                    databits: 8,
                    parity: 'none',
                    rtscts: false,
                    stopbits: 1,
                    xany: false,
                    xoff: false,
                    xon: false,
                    inputMode: 'local-echo' as InputMode,
                    outputMode: null,
                    inputNewlines: null,
                    outputNewlines: 'crlf' as NewlineMode,
                },
                isBuiltin: true,
                isTemplate: true,
            },
            ...(await this.serial.listPorts()).map(p => ({
                id: `serial:port-${slugify(p.name).replace('.', '-')}`,
                type: 'serial',
                name: p.description ? `Serial: ${p.description}` : 'Serial',
                icon: 'fas fa-microchip',
                isBuiltin: true,
                options: {
                    port: p.name,
                    inputMode: 'local-echo' as InputMode,
                    outputNewlines: 'crlf' as NewlineMode,
                },
            })),
        ]
    }

    async getNewTabParameters (profile: SerialProfile): Promise<NewTabParameters<SerialTabComponent>> {
        if (!profile.options.baudrate) {
            profile = deepClone(profile)
            profile.options.baudrate = await this.selector.show('Baud rate', BAUD_RATES.map(x => ({
                name: x.toString(), result: x,
            })))
        }
        return {
            type: SerialTabComponent,
            inputs: { profile },
        }
    }

    getDescription (profile: SerialProfile): string {
        return profile.options.port
    }
}
