/* eslint-disable @typescript-eslint/camelcase */
import colors from 'ansi-colors'
import * as ZModem from 'zmodem.js'
import * as fs from 'fs'
import * as path from 'path'
import { Observable } from 'rxjs'
import { filter } from 'rxjs/operators'
import { Injectable } from '@angular/core'
import { TerminalDecorator } from '../api/decorator'
import { TerminalTabComponent } from '../components/terminalTab.component'
import { LogService, Logger, ElectronService, HostAppService, HotkeysService } from 'terminus-core'

const SPACER = '            '

/** @hidden */
@Injectable()
export class ZModemDecorator extends TerminalDecorator {
    private logger: Logger
    private activeSession: any = null
    private cancelEvent: Observable<any>

    constructor (
        log: LogService,
        hotkeys: HotkeysService,
        private electron: ElectronService,
        private hostApp: HostAppService,
    ) {
        super()
        this.logger = log.create('zmodem')
        this.cancelEvent = hotkeys.hotkey$.pipe(filter(x => x === 'ctrl-c'))
    }

    attach (terminal: TerminalTabComponent): void {
        const sentry = new ZModem.Sentry({
            to_terminal: data => {
                if (!terminal.enablePassthrough) {
                    terminal.write(data)
                }
            },
            sender: data => terminal.session.write(Buffer.from(data)),
            on_detect: async detection => {
                try {
                    terminal.enablePassthrough = false
                    await this.process(terminal, detection)
                } finally {
                    terminal.enablePassthrough = true
                }
            },
            on_retract: () => {
                this.showMessage(terminal, 'transfer cancelled')
            },
        })
        setTimeout(() => {
            this.subscribeUntilDetached(terminal, terminal.session.binaryOutput$.subscribe(data => {
                const chunkSize = 1024
                for (let i = 0; i <= Math.floor(data.length / chunkSize); i++) {
                    try {
                        sentry.consume(data.subarray(i * chunkSize, (i + 1) * chunkSize))
                    } catch (e) {
                        this.logger.error('protocol error', e)
                        this.activeSession.abort()
                        this.activeSession = null
                        terminal.enablePassthrough = true
                        return
                    }
                }
            }))
        })
    }

    private async process (terminal, detection): Promise<void> {
        this.showMessage(terminal, colors.bgBlue.black(' ZMODEM ') + ' Session started')
        this.showMessage(terminal, '------------------------')

        const zsession = detection.confirm()
        this.activeSession = zsession
        this.logger.info('new session', zsession)

        if (zsession.type === 'send') {
            const result = await this.electron.dialog.showOpenDialog(
                this.hostApp.getWindow(),
                {
                    buttonLabel: 'Send',
                    properties: ['multiSelections', 'openFile', 'treatPackageAsDirectory'],
                },
            )
            if (result.canceled) {
                zsession.close()
                return
            }

            let filesRemaining = result.filePaths.length
            for (const filePath of result.filePaths) {
                await this.sendFile(terminal, zsession, filePath, filesRemaining)
                filesRemaining--
            }
            this.activeSession = null
            await zsession.close()
        } else {
            zsession.on('offer', xfer => {
                this.receiveFile(terminal, xfer, zsession)
            })

            zsession.start()

            await new Promise(resolve => zsession.on('session_end', resolve))
            this.activeSession = null
        }
    }

    private async receiveFile (terminal, xfer, zsession) {
        const details: {
            name: string,
            size: number,
        } = xfer.get_details()
        this.showMessage(terminal, colors.bgYellow.black(' Offered ') + ' ' + details.name, true)
        this.logger.info('offered', xfer)
        const result = await this.electron.dialog.showSaveDialog(
            this.hostApp.getWindow(),
            {
                defaultPath: details.name,
            },
        )
        if (!result.filePath) {
            this.showMessage(terminal, colors.bgRed.black(' Rejected ') + ' ' + details.name)
            xfer.skip()
            return
        }

        const stream = fs.createWriteStream(result.filePath)
        let bytesSent = 0
        let canceled = false
        const cancelSubscription = this.cancelEvent.subscribe(() => {
            if (terminal.hasFocus) {
                try {
                    zsession._skip()
                } catch {}
                canceled = true
            }
        })

        try {
            await Promise.race([
                xfer.accept({
                    on_input: chunk => {
                        if (canceled) {
                            return
                        }
                        stream.write(Buffer.from(chunk))
                        bytesSent += chunk.length
                        this.showMessage(terminal, colors.bgYellow.black(' ' + Math.round(100 * bytesSent / details.size).toString().padStart(3, ' ') + '% ') + ' ' + details.name, true)
                    },
                }),
                this.cancelEvent.toPromise(),
            ])

            if (canceled) {
                this.showMessage(terminal, colors.bgRed.black(' Canceled ') + ' ' + details.name)
            } else {
                this.showMessage(terminal, colors.bgGreen.black(' Received ') + ' ' + details.name)
            }
        } catch {
            this.showMessage(terminal, colors.bgRed.black(' Error ') + ' ' + details.name)
        }

        cancelSubscription.unsubscribe()
        stream.end()
    }

    private async sendFile (terminal, zsession, filePath, filesRemaining) {
        const stat = fs.statSync(filePath)
        const offer = {
            name: path.basename(filePath),
            size: stat.size,
            mode: stat.mode,
            mtime: Math.floor(stat.mtimeMs / 1000),
            files_remaining: filesRemaining,
            bytes_remaining: stat.size,
        }
        this.logger.info('offering', offer)
        this.showMessage(terminal, colors.bgYellow.black(' Offered ') + ' ' + offer.name, true)

        const xfer = await zsession.send_offer(offer)
        if (xfer) {
            let bytesSent = 0
            let canceled = false
            const stream = fs.createReadStream(filePath)
            const cancelSubscription = this.cancelEvent.subscribe(() => {
                if (terminal.hasFocus) {
                    canceled = true
                }
            })

            stream.on('data', chunk => {
                if (canceled) {
                    stream.close()
                    return
                }
                xfer.send(chunk)
                bytesSent += chunk.length
                this.showMessage(terminal, colors.bgYellow.black(' ' + Math.round(100 * bytesSent / offer.size).toString().padStart(3, ' ') + '% ') + offer.name, true)
            })

            await Promise.race([
                new Promise(resolve => stream.on('end', resolve)),
                this.cancelEvent.toPromise(),
            ])

            await xfer.end()

            if (canceled) {
                this.showMessage(terminal, colors.bgRed.black(' Canceled ') + ' ' + offer.name)
            } else {
                this.showMessage(terminal, colors.bgGreen.black(' Sent ') + ' ' + offer.name)
            }

            stream.close()
            cancelSubscription.unsubscribe()
        } else {
            this.showMessage(terminal, colors.bgRed.black(' Rejected ') + ' ' + offer.name)
            this.logger.warn('rejected by the other side')
        }
    }

    private showMessage (terminal, msg: string, overwrite = false) {
        terminal.write(Buffer.from(`\r${msg}${SPACER}`))
        if (!overwrite) {
            terminal.write(Buffer.from('\r\n'))
        }
    }
}
