import { Injectable } from '@angular/core'
import WSABinding from 'serialport-binding-webserialapi'
import AbstractBinding from '@serialport/binding-abstract'
import { autoDetect } from '@serialport/bindings-cpp'
import { HostAppService, Platform } from 'tabby-core'
import { SerialPortInfo } from '../api'

@Injectable({ providedIn: 'root' })
export class SerialService {
    private constructor (
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
}
