import { Injectable, Injector } from '@angular/core'
import WSABinding from 'serialport-binding-webserialapi'
import AbstractBinding from '@serialport/binding-abstract'
import { autoDetect } from '@serialport/bindings-cpp'
import { HostAppService, PartialProfile, Platform, ProfilesService } from 'tabby-core'
import { SerialPortInfo, SerialProfile } from '../api'
import { SerialTabComponent } from '../components/serialTab.component'

@Injectable({ providedIn: 'root' })
export class SerialService {
    private constructor (
        private injector: Injector,
        private hostApp: HostAppService,
    ) { }

    detectBinding (): typeof AbstractBinding {
        return this.hostApp.platform === Platform.Web ? WSABinding : autoDetect()
    }

    async listPorts (): Promise<SerialPortInfo[]> {
        try {
            return (await this.detectBinding().list()).map(x => ({
                name: x.path,
                description: `${x.manufacturer ?? ''} ${x.serialNumber ?? ''}`.trim() || undefined,
            }))
        } catch (err) {
            console.error('Failed to list serial ports', err)
            return []
        }
    }

    quickConnect (query: string): Promise<SerialTabComponent|null> {
        let path = query
        let baudrate = 115200
        if (query.includes('@')) {
            baudrate = parseInt(path.split('@')[1])
            path = path.split('@')[0]
        }
        const profile: PartialProfile<SerialProfile> = {
            name: query,
            type: 'serial',
            options: {
                port: path,
                baudrate: baudrate,
            },
        }
        window.localStorage.lastSerialConnection = JSON.stringify(profile)
        return this.injector.get(ProfilesService).openNewTabForProfile(profile) as Promise<SerialTabComponent|null>
    }
}
