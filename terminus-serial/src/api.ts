import { BaseSession } from 'terminus-terminal'
import { SerialPort } from 'serialport'
import { Logger } from 'terminus-core'
import { Subject, Observable } from 'rxjs'

export interface LoginScript {
    expect: string
    send: string
    isRegex?: boolean
    optional?: boolean
}

export interface SerialConnection {
    name: string
    port: string
    baudrate: number
    databits: number
    stopbits: number
    parity: string
    rtscts: boolean
    xon: boolean
    xoff: boolean
    xany: boolean
    scripts?: LoginScript[]
    color?: string
}

export const BAUD_RATES = [
    110, 150, 300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600,
]

export interface SerialPortInfo {
    name: string
    description?: string
}

export class SerialSession extends BaseSession {
    scripts?: LoginScript[]
    serial: SerialPort
    logger: Logger

    get serviceMessage$ (): Observable<string> { return this.serviceMessage }
    private serviceMessage = new Subject<string>()

    constructor (public connection: SerialConnection) {
        super()
        this.scripts = connection.scripts || []
    }

    async start (): Promise<void> {
        this.open = true

        this.serial.on('data', data => {
            const dataString = data.toString()
            this.emitOutput(data)

            if (this.scripts) {
                let found = false
                for (const script of this.scripts) {
                    let match = false
                    let cmd = ''
                    if (script.isRegex) {
                        const re = new RegExp(script.expect, 'g')
                        if (dataString.match(re)) {
                            cmd = dataString.replace(re, script.send)
                            match = true
                            found = true
                        }
                    } else {
                        if (dataString.includes(script.expect)) {
                            cmd = script.send
                            match = true
                            found = true
                        }
                    }

                    if (match) {
                        this.logger.info('Executing script: "' + cmd + '"')
                        this.serial.write(cmd + '\n')
                        this.scripts = this.scripts.filter(x => x !== script)
                    } else {
                        if (script.optional) {
                            this.logger.debug('Skip optional script: ' + script.expect)
                            found = true
                            this.scripts = this.scripts.filter(x => x !== script)
                        } else {
                            break
                        }
                    }
                }

                if (found) {
                    this.executeUnconditionalScripts()
                }
            }
        })

        this.serial.on('end', () => {
            this.logger.info('Shell session ended')
            if (this.open) {
                this.destroy()
            }
        })

        this.executeUnconditionalScripts()
    }

    write (data: Buffer): void {
        if (this.serial) {
            this.serial.write(data.toString())
        }
    }

    async destroy (): Promise<void> {
        this.serviceMessage.complete()
        await super.destroy()
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
    resize (_, __) { }

    kill (_?: string): void {
        this.serial.close()
    }

    async getChildProcesses (): Promise<any[]> {
        return []
    }

    async gracefullyKillProcess (): Promise<void> {
        this.kill('TERM')
    }

    async getWorkingDirectory (): Promise<string|null> {
        return null
    }

    private executeUnconditionalScripts () {
        if (this.scripts) {
            for (const script of this.scripts) {
                if (!script.expect) {
                    console.log('Executing script:', script.send)
                    this.serial.write(script.send + '\n')
                    this.scripts = this.scripts.filter(x => x !== script)
                } else {
                    break
                }
            }
        }
    }
}

export interface SerialConnectionGroup {
    name: string
    connections: SerialConnection[]
}
