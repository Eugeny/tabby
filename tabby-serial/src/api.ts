import stripAnsi from 'strip-ansi'
import { SerialPortStream } from '@serialport/stream'
import { LogService, NotificationsService } from 'tabby-core'
import { Subject, Observable } from 'rxjs'
import { Injector, NgZone } from '@angular/core'
import { BaseSession, ConnectableTerminalProfile, InputProcessingOptions, InputProcessor, LoginScriptsOptions, SessionMiddleware, StreamProcessingOptions, TerminalStreamProcessor, UTF8SplitterMiddleware } from 'tabby-terminal'
import { SerialService } from './services/serial.service'

export interface SerialProfile extends ConnectableTerminalProfile {
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
    slowSend?: boolean
    input: InputProcessingOptions,
}

export const BAUD_RATES = [
    110, 150, 300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1500000,
]

export interface SerialPortInfo {
    name: string
    description?: string
}

class SlowFeedMiddleware extends SessionMiddleware {
    feedFromTerminal (data: Buffer): void {
        for (const byte of data) {
            this.outputToSession.next(Buffer.from([byte]))
        }
    }
}

export class SerialSession extends BaseSession {
    serial: SerialPortStream|null

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
        this.middleware.push(this.streamProcessor)

        if (this.profile.options.slowSend) {
            this.middleware.unshift(new SlowFeedMiddleware())
        }

        this.middleware.push(new UTF8SplitterMiddleware())
        this.middleware.push(new InputProcessor(profile.options.input))

        this.setLoginScriptsOptions(profile.options)
    }

    async start (): Promise<void> {
        if (!this.profile.options.port) {
            this.profile.options.port = (await this.serialService.listPorts())[0].name
        }

        const serial = this.serial = new SerialPortStream({
            binding: this.serialService.detectBinding(),
            path: this.profile.options.port,
            autoOpen: false,
            baudRate: parseInt(this.profile.options.baudrate as any),
            dataBits: this.profile.options.databits ?? 8 as any,
            stopBits: this.profile.options.stopbits ?? 1 as any,
            parity: this.profile.options.parity ?? 'none',
            rtscts: this.profile.options.rtscts ?? false,
            xon: this.profile.options.xon ?? false,
            xoff: this.profile.options.xoff ?? false,
            xany: this.profile.options.xany ?? false,
        })
        let connected = false
        await new Promise(async (resolve, reject) => {
            serial.on('open', () => {
                connected = true
                this.zone.run(resolve)
            })
            serial.on('error', error => {
                this.zone.run(() => {
                    if (connected) {
                        this.notifications.error(error.message)
                    } else {
                        reject(error)
                    }
                    this.destroy()
                })
            })
            serial.on('close', () => {
                this.emitServiceMessage('Port closed')
                this.destroy()
            })

            try {
                serial.open()
            } catch (e) {
                this.notifications.error(e.message)
                reject(e)
            }
        })

        this.open = true
        setTimeout(() => this.streamProcessor.start())

        serial.on('readable', () => {
            this.emitOutput(serial.read())
        })

        serial.on('end', () => {
            this.logger.info('Shell session ended')
            if (this.open) {
                this.destroy()
            }
        })

        this.loginScriptProcessor?.executeUnconditionalScripts()
    }

    write (data: Buffer): void {
        this.serial?.write(data)
    }

    async destroy (): Promise<void> {
        this.serviceMessage.complete()
        await super.destroy()
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
    resize (_, __) {
        this.streamProcessor.resize()
    }

    kill (_?: string): void {
        this.serial?.close()
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
