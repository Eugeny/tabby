import slugify from 'slugify'
import SerialPort from 'serialport'
import WSABinding from 'serialport-binding-webserialapi'
import deepClone from 'clone-deep'
import { Injectable } from '@angular/core'
import { ProfileProvider, NewTabParameters, SelectorService, HostAppService, Platform } from 'tabby-core'
import { SerialProfileSettingsComponent } from './components/serialProfileSettings.component'
import { SerialTabComponent } from './components/serialTab.component'
import { SerialService } from './services/serial.service'
import { BAUD_RATES, SerialProfile } from './api'

@Injectable({ providedIn: 'root' })
export class SerialProfilesService extends ProfileProvider<SerialProfile> {
    id = 'serial'
    name = 'Serial'
    settingsComponent = SerialProfileSettingsComponent
    configDefaults = {
        options: {
            port: null,
            baudrate: null,
            databits: 8,
            stopbits: 1,
            parity: 'none',
            rtscts: false,
            xon: false,
            xoff: false,
            xany: false,
            inputMode: 'local-echo',
            outputMode: null,
            inputNewlines: null,
            outputNewlines: 'crlf',
            scripts: [],
        },
    }

    constructor (
        private selector: SelectorService,
        private serial: SerialService,
        private hostApp: HostAppService,
    ) {
        super()
        if (hostApp.platform === Platform.Web) {
            SerialPort.Binding = WSABinding
        }
    }

    async getBuiltinProfiles (): Promise<SerialProfile[]> {
        if (this.hostApp.platform === Platform.Web) {
            return [
                {
                    id: `serial:web`,
                    type: 'serial',
                    name: 'Serial connection',
                    icon: 'fas fa-microchip',
                    isBuiltin: true,
                } as SerialProfile,
            ]
        }

        return [
            {
                id: `serial:template`,
                type: 'serial',
                name: 'Serial connection',
                icon: 'fas fa-microchip',
                isBuiltin: true,
                isTemplate: true,
            } as SerialProfile,
            ...(await this.serial.listPorts()).map(p => ({
                id: `serial:port-${slugify(p.name).replace('.', '-')}`,
                type: 'serial',
                name: p.description ? `Serial: ${p.description}` : 'Serial',
                icon: 'fas fa-microchip',
                isBuiltin: true,
                options: {
                    port: p.name,
                },
            } as SerialProfile)),
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
