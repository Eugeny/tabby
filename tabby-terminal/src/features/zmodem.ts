import colors from 'ansi-colors'
import * as ZModem from 'zmodem.js'
import { Observable, filter, first } from 'rxjs'
import { Injectable } from '@angular/core'
import { TerminalDecorator } from '../api/decorator'
import { BaseTerminalTabComponent } from '../api/baseTerminalTab.component'
import { LogService, Logger, HotkeysService, PlatformService, FileUpload } from 'tabby-core'

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
        private platform: PlatformService,
    ) {
        super()
        this.logger = log.create('zmodem')
        this.cancelEvent = hotkeys.hotkey$.pipe(filter(x => x === 'ctrl-c'))
    }

    attach (terminal: BaseTerminalTabComponent): void {
        const sentry = new ZModem.Sentry({
            to_terminal: data => {
                if (!terminal.enablePassthrough) {
                    terminal.write(data)
                }
            },
            sender: data => terminal.session!.write(Buffer.from(data)),
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
            this.attachToSession(sentry, terminal)
            this.subscribeUntilDetached(terminal, terminal.sessionChanged$.subscribe(() => {
                this.attachToSession(sentry, terminal)
            }))
        })
    }

    private attachToSession (sentry, terminal) {
        if (!terminal.session) {
            return
        }
        this.subscribeUntilDetached(terminal, terminal.session.binaryOutput$.subscribe(data => {
            const chunkSize = 1024
            for (let i = 0; i <= Math.floor(data.length / chunkSize); i++) {
                try {
                    sentry.consume(Buffer.from(data.slice(i * chunkSize, (i + 1) * chunkSize)))
                } catch (e) {
                    this.showMessage(terminal, colors.bgRed.black(' Error ') + ' ' + e)
                    this.logger.error('protocol error', e)
                    this.activeSession.abort()
                    this.activeSession = null
                    terminal.enablePassthrough = true
                    return
                }
            }
        }))
    }

    private async process (terminal, detection): Promise<void> {
        this.showMessage(terminal, colors.bgBlue.black(' ZMODEM ') + ' Session started')
        this.showMessage(terminal, '------------------------')

        const zsession = detection.confirm()
        this.activeSession = zsession
        this.logger.info('new session', zsession)

        if (zsession.type === 'send') {
            const transfers = await this.platform.startUpload({ multiple: true })
            let filesRemaining = transfers.length
            let sizeRemaining = transfers.reduce((a, b) => a + b.getSize(), 0)
            for (const transfer of transfers) {
                await this.sendFile(terminal, zsession, transfer, filesRemaining, sizeRemaining)
                filesRemaining--
                sizeRemaining -= transfer.getSize()
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

        const transfer = await this.platform.startDownload(details.name, 0o644, details.size)
        if (!transfer) {
            this.showMessage(terminal, colors.bgRed.black(' Rejected ') + ' ' + details.name)
            xfer.skip()
            return
        }

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
                        transfer.write(Buffer.from(chunk))
                        this.showMessage(terminal, colors.bgYellow.black(' ' + Math.round(100 * transfer.getCompletedBytes() / details.size).toString().padStart(3, ' ') + '% ') + ' ' + details.name, true)
                    },
                }),
                this.cancelEvent.pipe(first()).toPromise(),
            ])

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (canceled) {
                transfer.cancel()
                this.showMessage(terminal, colors.bgRed.black(' Canceled ') + ' ' + details.name)
            } else {
                transfer.close()
                this.showMessage(terminal, colors.bgGreen.black(' Received ') + ' ' + details.name)
            }
        } catch {
            this.showMessage(terminal, colors.bgRed.black(' Error ') + ' ' + details.name)
        }

        cancelSubscription.unsubscribe()
    }

    private async sendFile (terminal, zsession, transfer: FileUpload, filesRemaining, sizeRemaining) {
        const offer = {
            name: transfer.getName(),
            size: transfer.getSize(),
            mode: 0o755,
            files_remaining: filesRemaining,
            bytes_remaining: sizeRemaining,
        }
        this.logger.info('offering', offer)
        this.showMessage(terminal, colors.bgYellow.black(' Offered ') + ' ' + offer.name, true)

        const xfer = await zsession.send_offer(offer)
        if (xfer) {
            let canceled = false
            const cancelSubscription = this.cancelEvent.subscribe(() => {
                if (terminal.hasFocus) {
                    canceled = true
                }
            })

            while (true) {
                const chunk = await transfer.read()
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (canceled || !chunk.length) {
                    break
                }

                await xfer.send(chunk)
                this.showMessage(terminal, colors.bgYellow.black(' ' + Math.round(100 * transfer.getCompletedBytes() / offer.size).toString().padStart(3, ' ') + '% ') + offer.name, true)
            }

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (canceled) {
                transfer.cancel()
            } else {
                transfer.close()
            }

            await xfer.end()

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (canceled) {
                this.showMessage(terminal, colors.bgRed.black(' Canceled ') + ' ' + offer.name)
            } else {
                this.showMessage(terminal, colors.bgGreen.black(' Sent ') + ' ' + offer.name)
            }

            cancelSubscription.unsubscribe()
        } else {
            transfer.cancel()
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
