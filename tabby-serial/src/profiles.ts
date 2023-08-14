import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import slugify from 'slugify'
import deepClone from 'clone-deep'
import { Injectable } from '@angular/core'
import { NewTabParameters, SelectorService, HostAppService, Platform, TranslateService, ConnectableProfileProvider } from 'tabby-core'
import { SerialProfileSettingsComponent } from './components/serialProfileSettings.component'
import { SerialTabComponent } from './components/serialTab.component'
import { SerialService } from './services/serial.service'
import { BAUD_RATES, SerialProfile } from './api'

@Injectable({ providedIn: 'root' })
export class SerialProfilesService extends ConnectableProfileProvider<SerialProfile> {
    id = 'serial'
    name = _('Serial')
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
            inputMode: null,
            outputMode: null,
            inputNewlines: null,
            outputNewlines: null,
            scripts: [],
            slowSend: false,
            input: { backspace: 'backspace' },
        },
        clearServiceMessagesOnConnect: false,
    }

    constructor (
        private selector: SelectorService,
        private serial: SerialService,
        private hostApp: HostAppService,
        private translate: TranslateService,
    ) {
        super()
    }

    async getBuiltinProfiles (): Promise<SerialProfile[]> {
        if (this.hostApp.platform === Platform.Web) {
            return [
                {
                    id: `serial:web`,
                    type: 'serial',
                    name: this.translate.instant('Serial connection'),
                    icon: 'fas fa-microchip',
                    isBuiltin: true,
                } as SerialProfile,
            ]
        }

        return [
            {
                id: `serial:template`,
                type: 'serial',
                name: this.translate.instant('Serial connection'),
                icon: 'fas fa-microchip',
                isBuiltin: true,
                isTemplate: true,
            } as SerialProfile,
            ...(await this.serial.listPorts()).map(p => ({
                id: `serial:port-${slugify(p.name).replace('.', '-')}`,
                type: 'serial',
                name: p.description ?
                    this.translate.instant('Serial: {description}', p) :
                    this.translate.instant('Serial'),
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
            profile.options.baudrate = await this.selector.show(
                this.translate.instant('Baud rate'),
                BAUD_RATES.map(x => ({
                    name: x.toString(), result: x,
                })),
            )
        }
        return {
            type: SerialTabComponent,
            inputs: { profile },
        }
    }

    getSuggestedName (profile: SerialProfile): string {
        return this.getDescription(profile)
    }

    getDescription (profile: SerialProfile): string {
        return profile.options.port
    }
}
