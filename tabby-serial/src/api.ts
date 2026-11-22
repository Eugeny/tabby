import stripAnsi from 'strip-ansi'
import { connect, Socket } from 'net'
import { SerialPortStream } from '@serialport/stream'
import { LogService, NotificationsService } from 'tabby-core'
import { Subject, Observable } from 'rxjs'
import { Injector, NgZone } from '@angular/core'
import { BaseSession, ConnectableTerminalProfile, InputProcessingOptions, InputProcessor, LoginScriptsOptions, SessionMiddleware, StreamProcessingOptions, TerminalStreamProcessor, UTF8SplitterMiddleware } from 'tabby-terminal'
import { SerialService } from './services/serial.service'

export interface SerialProfile extends ConnectableTerminalProfile {
    options: SerialProfileOptions
}

export type SerialConnectionType = 'serial' | 'pipe'

export interface SerialProfileOptions extends StreamProcessingOptions, LoginScriptsOptions {
    port: string
    connectionType: SerialConnectionType
    baudrate: number | null
    databits: 5 | 6 | 7 | 8
    stopbits: 1 | 1.5 | 2
    parity: string
    rtscts: boolean
    xon: boolean
    xoff: boolean
    xany: boolean
    slowSend: boolean
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
    private socket: Socket|null = null

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

        if (this.profile.options.connectionType === 'pipe') {
            await this.startPipe()
        } else {
            await this.startSerial()
        }

        this.open = true
        setTimeout(() => this.streamProcessor.start())
        this.loginScriptProcessor?.executeUnconditionalScripts()
    }

    private async startSerial (): Promise<void> {
        const serial = this.serial = new SerialPortStream({
            binding: this.serialService.detectBinding(),
            path: this.profile.options.port,
            autoOpen: false,
            baudRate: parseInt(this.profile.options.baudrate as any),
            dataBits: this.profile.options.databits,
            stopBits: this.profile.options.stopbits,
            parity: this.profile.options.parity,
            rtscts: this.profile.options.rtscts,
            xon: this.profile.options.xon,
            xoff: this.profile.options.xoff,
            xany: this.profile.options.xany,
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

        serial.on('readable', () => {
            this.emitOutput(serial.read())
        })

        serial.on('end', () => {
            this.logger.info('Shell session ended')
            if (this.open) {
                this.destroy()
            }
        })
    }

    private async startPipe (): Promise<void> {
        // net.connect({path}) opens Unix domain sockets and Windows named pipes
        // (e.g. \\.\pipe\name) using Node's built-in binding - no serial ioctls.
        const socket = this.socket = connect({ path: this.profile.options.port })
        let connected = false
        await new Promise<void>((resolve, reject) => {
            socket.once('connect', () => {
                connected = true
                this.zone.run(resolve)
            })
            socket.on('error', error => {
                this.zone.run(() => {
                    if (connected) {
                        this.notifications.error(error.message)
                    } else {
                        reject(error)
                    }
                    this.destroy()
                })
            })
            socket.on('close', () => {
                this.emitServiceMessage('Pipe closed')
                this.destroy()
            })

            socket.on('data', data => this.emitOutput(data))
            socket.on('end', () => {
                this.logger.info('Shell session ended')
                if (this.open) {
                    this.destroy()
                }
            })
        })
    }

    write (data: Buffer): void {
        this.serial?.write(data)
        this.socket?.write(data)
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
        this.socket?.destroy()
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
