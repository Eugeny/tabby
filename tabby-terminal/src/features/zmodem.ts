import colors from 'ansi-colors'
import * as ZModem from 'zmodem.js'
import { Observable, filter, first } from 'rxjs'
import { Injectable } from '@angular/core'
import { TerminalDecorator } from '../api/decorator'
import { BaseTerminalTabComponent } from '../api/baseTerminalTab.component'
import { SessionMiddleware } from '../api/middleware'
import { LogService, Logger, HotkeysService, PlatformService, FileUpload } from 'tabby-core'

const SPACER = '            '

class ZModemMiddleware extends SessionMiddleware {
    private sentry: ZModem.Sentry
    private isActive = false
    private logger: Logger
    private activeSession: any = null
    private cancelEvent: Observable<any>

    constructor (
        log: LogService,
        hotkeys: HotkeysService,
        private platform: PlatformService,
    ) {
        super()
        this.cancelEvent = this.outputToSession$.pipe(filter(x => x.length === 1 && x[0] === 3))

        this.logger = log.create('zmodem')
        this.sentry = new ZModem.Sentry({
            to_terminal: data => {
                if (this.isActive) {
                    this.outputToTerminal.next(Buffer.from(data))
                }
            },
            sender: data => this.outputToSession.next(Buffer.from(data)),
            on_detect: async detection => {
                try {
                    this.isActive = true
                    await this.process(detection)
                } finally {
                    this.isActive = false
                }
            },
            on_retract: () => {
                this.showMessage('transfer cancelled')
            },
        })
    }

    feedFromSession (data: Buffer): void {
        const chunkSize = 1024
        for (let i = 0; i <= Math.floor(data.length / chunkSize); i++) {
            try {
                this.sentry.consume(Buffer.from(data.slice(i * chunkSize, (i + 1) * chunkSize)))
            } catch (e) {
                this.showMessage(colors.bgRed.black(' Error ') + ' ' + e)
                this.logger.error('protocol error', e)
                this.activeSession.abort()
                this.activeSession = null
                this.isActive = false
                return
            }
        }
        if (!this.isActive) {
            this.outputToTerminal.next(data)
        }
    }

    private async process (detection): Promise<void> {
        this.showMessage(colors.bgBlue.black(' ZMODEM ') + ' Session started')
        this.showMessage('------------------------')

        const zsession = detection.confirm()
        this.activeSession = zsession
        this.logger.info('new session', zsession)

        if (zsession.type === 'send') {
            const transfers = await this.platform.startUpload({ multiple: true })
            let filesRemaining = transfers.length
            let sizeRemaining = transfers.reduce((a, b) => a + b.getSize(), 0)
            for (const transfer of transfers) {
                await this.sendFile(zsession, transfer, filesRemaining, sizeRemaining)
                filesRemaining--
                sizeRemaining -= transfer.getSize()
            }
            this.activeSession = null
            await zsession.close()
        } else {
            zsession.on('offer', xfer => {
                this.receiveFile(xfer, zsession)
            })

            zsession.start()

            await new Promise(resolve => zsession.on('session_end', resolve))
            this.activeSession = null
        }
    }

    private async receiveFile (xfer, zsession) {
        const details: {
            name: string,
            size: number,
        } = xfer.get_details()
        this.showMessage(colors.bgYellow.black(' Offered ') + ' ' + details.name, true)
        this.logger.info('offered', xfer)

        const transfer = await this.platform.startDownload(details.name, 0o644, details.size)
        if (!transfer) {
            this.showMessage(colors.bgRed.black(' Rejected ') + ' ' + details.name)
            xfer.skip()
            return
        }

        let canceled = false
        const cancelSubscription = this.cancelEvent.subscribe(() => {
            try {
                zsession._skip()
            } catch {}
            canceled = true
        })

        try {
            await Promise.race([
                xfer.accept({
                    on_input: chunk => {
                        if (canceled) {
                            return
                        }
                        transfer.write(Buffer.from(chunk))
                        this.showMessage(colors.bgYellow.black(' ' + Math.round(100 * transfer.getCompletedBytes() / details.size).toString().padStart(3, ' ') + '% ') + ' ' + details.name, true)
                    },
                }),
                this.cancelEvent.pipe(first()).toPromise(),
            ])

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (canceled) {
                transfer.cancel()
                this.showMessage(colors.bgRed.black(' Canceled ') + ' ' + details.name)
            } else {
                transfer.close()
                this.showMessage(colors.bgGreen.black(' Received ') + ' ' + details.name)
            }
        } catch {
            this.showMessage(colors.bgRed.black(' Error ') + ' ' + details.name)
        }

        cancelSubscription.unsubscribe()
    }

    private async sendFile (zsession, transfer: FileUpload, filesRemaining, sizeRemaining) {
        const offer = {
            name: transfer.getName(),
            size: transfer.getSize(),
            mode: transfer.getMode(),
            files_remaining: filesRemaining,
            bytes_remaining: sizeRemaining,
        }
        this.logger.info('offering', offer)
        this.showMessage(colors.bgYellow.black(' Offered ') + ' ' + offer.name, true)

        const xfer = await zsession.send_offer(offer)
        if (xfer) {
            let canceled = false
            const cancelSubscription = this.cancelEvent.subscribe(() => {
                canceled = true
            })

            while (true) {
                const chunk = await transfer.read()
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (canceled || !chunk.length) {
                    break
                }

                await xfer.send(chunk)
                this.showMessage(colors.bgYellow.black(' ' + Math.round(100 * transfer.getCompletedBytes() / offer.size).toString().padStart(3, ' ') + '% ') + offer.name, true)
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
                this.showMessage(colors.bgRed.black(' Canceled ') + ' ' + offer.name)
            } else {
                this.showMessage(colors.bgGreen.black(' Sent ') + ' ' + offer.name)
            }

            cancelSubscription.unsubscribe()
        } else {
            transfer.cancel()
            this.showMessage(colors.bgRed.black(' Rejected ') + ' ' + offer.name)
            this.logger.warn('rejected by the other side')
        }
    }

    private showMessage (msg: string, overwrite = false) {
        this.outputToTerminal.next(Buffer.from(`\r${msg}${SPACER}`))
        if (!overwrite) {
            this.outputToTerminal.next(Buffer.from('\r\n'))
        }
    }
}

/** @hidden */
@Injectable()
export class ZModemDecorator extends TerminalDecorator {
    constructor (
        private log: LogService,
        private hotkeys: HotkeysService,
        private platform: PlatformService,
    ) {
        super()
    }

    attach (terminal: BaseTerminalTabComponent<any>): void {
        setTimeout(() => {
            this.attachToSession(terminal)
            this.subscribeUntilDetached(terminal, terminal.sessionChanged$.subscribe(() => {
                this.attachToSession(terminal)
            }))
        })
    }

    private attachToSession (terminal: BaseTerminalTabComponent<any>) {
        if (!terminal.session) {
            return
        }
        terminal.session.middleware.unshift(new ZModemMiddleware(this.log, this.hotkeys, this.platform))
    }
}
