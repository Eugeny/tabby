import { Injectable, NgZone } from '@angular/core'
import SerialPort from 'serialport'
import { ToastrService } from 'ngx-toastr'
import { LogService } from 'terminus-core'
import { SerialConnection, SerialSession, SerialPortInfo } from '../api'

@Injectable({ providedIn: 'root' })
export class SerialService {
    private constructor (
        private log: LogService,
        private zone: NgZone,
        private toastr: ToastrService,
    ) { }

    async listPorts (): Promise<SerialPortInfo[]> {
        return (await SerialPort.list()).map(x => ({
            name: x.path,
            description: x.manufacturer || x.serialNumber ? `${x.manufacturer || ''} ${x.serialNumber || ''}` : undefined,
        }))
    }

    createSession (connection: SerialConnection): SerialSession {
        const session = new SerialSession(connection)
        session.logger = this.log.create(`serial-${connection.port}`)
        return session
    }

    async connectSession (session: SerialSession, _?: (s: any) => void): Promise<SerialPort> {
        const serial = new SerialPort(session.connection.port, { autoOpen: false, baudRate: session.connection.baudrate,
            dataBits: session.connection.databits, stopBits: session.connection.stopbits, parity: session.connection.parity,
            rtscts: session.connection.rtscts, xon: session.connection.xon, xoff: session.connection.xoff,
            xany: session.connection.xany })
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
                        this.toastr.error(error.toString())
                    } else {
                        reject(error)
                    }
                })
            })

            try {
                serial.open()
            } catch (e) {
                this.toastr.error(e.message)
                reject(e)
            }

        })
        return serial
    }
}
