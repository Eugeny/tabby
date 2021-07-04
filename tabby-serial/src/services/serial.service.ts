import { Injectable, NgZone } from '@angular/core'
import SerialPort from 'serialport'
import { LogService, NotificationsService, SelectorService, ProfilesService } from 'tabby-core'
import { SerialSession, SerialPortInfo, BAUD_RATES, SerialProfile } from '../api'
import { SerialTabComponent } from '../components/serialTab.component'

@Injectable({ providedIn: 'root' })
export class SerialService {
    private constructor (
        private log: LogService,
        private zone: NgZone,
        private notifications: NotificationsService,
        private profilesService: ProfilesService,
        private selector: SelectorService,
    ) { }

    async listPorts (): Promise<SerialPortInfo[]> {
        return (await SerialPort.list()).map(x => ({
            name: x.path,
            description: x.manufacturer || x.serialNumber ? `${x.manufacturer || ''} ${x.serialNumber || ''}` : undefined,
        }))
    }

    createSession (profile: SerialProfile): SerialSession {
        const session = new SerialSession(profile)
        session.logger = this.log.create(`serial-${profile.options.port}`)
        return session
    }

    async connectSession (session: SerialSession): Promise<SerialPort> {
        const serial = new SerialPort(session.profile.options.port, {
            autoOpen: false,
            baudRate: parseInt(session.profile.options.baudrate as any),
            dataBits: session.profile.options.databits,
            stopBits: session.profile.options.stopbits,
            parity: session.profile.options.parity,
            rtscts: session.profile.options.rtscts,
            xon: session.profile.options.xon,
            xoff: session.profile.options.xoff,
            xany: session.profile.options.xany,
        })
        session.serial = serial
        let connected = false
        await new Promise(async (resolve, reject) => {
            serial.on('open', () => {
                connected = true
                this.zone.run(resolve)
            })
            serial.on('error', error => {
                this.zone.run(() => {
                    if (connected) {
                        this.notifications.error(error.toString())
                    } else {
                        reject(error)
                    }
                })
            })
            serial.on('close', () => {
                session.emitServiceMessage('Port closed')
                session.destroy()
            })

            try {
                serial.open()
            } catch (e) {
                this.notifications.error(e.message)
                reject(e)
            }
        })
        return serial
    }

    quickConnect (query: string): Promise<SerialTabComponent|null> {
        let path = query
        let baudrate = 115200
        if (query.includes('@')) {
            baudrate = parseInt(path.split('@')[1])
            path = path.split('@')[0]
        }
        const profile: SerialProfile = {
            name: query,
            type: 'serial',
            options: {
                port: path,
                baudrate: baudrate,
                databits: 8,
                parity: 'none',
                rtscts: false,
                stopbits: 1,
                xany: false,
                xoff: false,
                xon: false,
            },
        }
        window.localStorage.lastSerialConnection = JSON.stringify(profile)
        return this.profilesService.openNewTabForProfile(profile) as Promise<SerialTabComponent|null>
    }

    async connectFoundPort (port: SerialPortInfo): Promise<SerialTabComponent|null> {
        const rate = await this.selector.show('Baud rate', BAUD_RATES.map(x => ({
            name: x.toString(), result: x,
        })))
        return this.quickConnect(`${port.name}@${rate}`)
    }
}
