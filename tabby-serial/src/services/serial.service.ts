import { Injectable } from '@angular/core'
import SerialPort from 'serialport'
import { PartialProfile, ProfilesService } from 'tabby-core'
import { SerialPortInfo, SerialProfile } from '../api'
import { SerialTabComponent } from '../components/serialTab.component'

@Injectable({ providedIn: 'root' })
export class SerialService {
    private constructor (
        private profilesService: ProfilesService,
    ) { }

    async listPorts (): Promise<SerialPortInfo[]> {
        return (await SerialPort.list()).map(x => ({
            name: x.path,
            description: x.manufacturer || x.serialNumber ? `${x.manufacturer || ''} ${x.serialNumber || ''}` : undefined,
        }))
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
        return this.profilesService.openNewTabForProfile(profile) as Promise<SerialTabComponent|null>
    }
}
