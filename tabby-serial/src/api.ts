import stripAnsi from 'strip-ansi'
import SerialPort from 'serialport'
import { LogService, NotificationsService, Profile } from 'tabby-core'
import { Subject, Observable } from 'rxjs'
import { Injector, NgZone } from '@angular/core'
import { BaseSession, LoginScriptsOptions, StreamProcessingOptions, TerminalStreamProcessor } from 'tabby-terminal'
import { SerialService } from './services/serial.service'

export interface SerialProfile extends Profile {
    options: SerialProfileOptions
}

export interface SerialProfileOptions extends StreamProcessingOptions, LoginScriptsOptions {
    port: string
    baudrate?: number
    databits?: number
    stopbits?: number
    parity?: string
    rtscts?: boolean
    xon?: boolean
    xoff?: boolean
    xany?: boolean
}

export const BAUD_RATES = [
    110, 150, 300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1500000,
]

export interface SerialPortInfo {
    name: string
    description?: string
}

export class SerialSession extends BaseSession {
    serial: SerialPort

    get serviceMessage$ (): Observable<string> { return this.serviceMessage }
    private serviceMessage = new Subject<string>()
    private streamProcessor: TerminalStreamProcessor
    private zone: NgZone
    private notifications: NotificationsService
    private serialService: SerialService

    constructor (injector: Injector, public profile: SerialProfile) {
        super(injector.get(LogService).create(`serial-${profile.options.port}`))
        this.serialService = injector.get(SerialService)

        this.zone = injector.get(NgZone)
        this.notifications = injector.get(NotificationsService)

        this.streamProcessor = new TerminalStreamProcessor(profile.options)
        this.streamProcessor.outputToSession$.subscribe(data => {
            this.serial?.write(data.toString())
        })
        this.streamProcessor.outputToTerminal$.subscribe(data => {
            this.emitOutput(data)
            this.loginScriptProcessor?.feedFromSession(data)
        })

        this.setLoginScriptsOptions(profile.options)
    }

    async start (): Promise<void> {
        if (!this.profile.options.port) {
            this.profile.options.port = (await this.serialService.listPorts())[0].name
        }

        this.serial = new SerialPort(this.profile.options.port, {
            autoOpen: false,
            baudRate: parseInt(this.profile.options.baudrate as any),
            dataBits: this.profile.options.databits ?? 8,
            stopBits: this.profile.options.stopbits ?? 1,
            parity: this.profile.options.parity ?? 'none',
            rtscts: this.profile.options.rtscts ?? false,
            xon: this.profile.options.xon ?? false,
            xoff: this.profile.options.xoff ?? false,
            xany: this.profile.options.xany ?? false,
        })
        let connected = false
        await new Promise(async (resolve, reject) => {
            this.serial.on('open', () => {
                connected = true
                this.zone.run(resolve)
            })
            this.serial.on('error', error => {
                this.zone.run(() => {
                    if (connected) {
                        this.notifications.error(error.toString())
                    } else {
                        reject(error)
                    }
                    this.destroy()
                })
            })
            this.serial.on('close', () => {
                this.emitServiceMessage('Port closed')
                this.destroy()
            })

            try {
                this.serial.open()
            } catch (e) {
                this.notifications.error(e.message)
                reject(e)
            }
        })

        this.open = true
        setTimeout(() => this.streamProcessor.start())

        this.serial.on('readable', () => {
            this.streamProcessor.feedFromSession(this.serial.read())
        })

        this.serial.on('end', () => {
            this.logger.info('Shell session ended')
            if (this.open) {
                this.destroy()
            }
        })

        this.loginScriptProcessor?.executeUnconditionalScripts()
    }

    write (data: Buffer): void {
        this.streamProcessor.feedFromTerminal(data)
    }

    async destroy (): Promise<void> {
        this.streamProcessor.close()
        this.serviceMessage.complete()
        await super.destroy()
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
    resize (_, __) {
        this.streamProcessor.resize()
    }

    kill (_?: string): void {
        this.serial.close()
    }

    emitServiceMessage (msg: string): void {
        this.serviceMessage.next(msg)
        this.logger.info(stripAnsi(msg))
    }

    async getChildProcesses (): Promise<any[]> {
        return []
    }

    async gracefullyKillProcess (): Promise<void> {
        this.kill('TERM')
    }

    supportsWorkingDirectory (): boolean {
        return false
    }

    async getWorkingDirectory (): Promise<string|null> {
        return null
    }
}
