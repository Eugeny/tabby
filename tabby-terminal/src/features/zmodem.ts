import colors from 'ansi-colors'
import * as ZModem from 'zmodem.js'
import { Observable, filter, first } from 'rxjs'
import { EnvironmentInjector, inject, Injectable } from '@angular/core'
import { TerminalDecorator } from '../api/decorator'
import { BaseTerminalTabComponent } from '../api/baseTerminalTab.component'
import { SessionMiddleware } from '../api/middleware'
import { LogService, Logger, PlatformService, FileUpload, TranslateService } from 'tabby-core'

const SPACER = '            '

class ZModemMiddleware extends SessionMiddleware {
    private sentry: ZModem.Sentry
    private isActive = false
    private logger: Logger
    private activeSession: any = null
    private cancelEvent: Observable<any>

    // While non-null, terminal output is buffered here instead of being sent
    // straight to the terminal. Used to hold back a receive session's trailing
    // bytes (the shell prompt redrawn after sz exits) until after the final
    // "Received"/"Complete" messages have been printed, so the prompt is not
    // overwritten by showMessage()'s leading "\r".
    private trailingBuffer: Buffer[] | null = null

    private flushTrailingBuffer () {
        const buffered = this.trailingBuffer
        this.trailingBuffer = null
        if (!buffered?.length) {
            return
        }
        for (const chunk of buffered) {
            this.outputToTerminal.next(chunk)
        }
    }

    private log = inject(LogService)
    private translate = inject(TranslateService)
    private platform = inject(PlatformService)

    constructor () {
        super()
        this.cancelEvent = this.outputToSession$.pipe(filter(x => x.length === 1 && x[0] === 3))

        this.logger = this.log.create('zmodem')
        this.sentry = new ZModem.Sentry({
            // to_terminal is zmodem.js' single terminal-output channel. It
            // receives normal passthrough data (while no session is active),
            // protocol "garbage", and crucially the trailing bytes that follow
            // a session's "OO" terminator (e.g. the shell prompt redrawn after
            // sz/rz exits). These trailing bytes are emitted synchronously from
            // within the same consume() call that fires session_end, so any
            // guard based on isActive/activeSession would drop them on platforms
            // where "OO" and the prompt arrive in the same chunk (Linux).
            // While trailingBuffer is active they are queued so the final
            // status messages can be printed first; otherwise forward directly.
            to_terminal: data => {
                if (this.trailingBuffer) {
                    this.trailingBuffer.push(Buffer.from(data))
                } else {
                    this.outputToTerminal.next(Buffer.from(data))
                }
            },
            sender: data => this.outputToSession.next(Buffer.from(data)),
            on_detect: async detection => {
                if ((await this.platform.showMessageBox({
                    type: 'warning',
                    message: this.translate.instant('Accept a ZMODEM session?'),
                    detail: this.translate.instant('If you have not requested it, it could be a sign of malicious activity.'),
                    buttons: [
                        this.translate.instant('Accept'),
                        this.translate.instant('Reject'),
                    ],
                    defaultId: 0,
                    cancelId: 1,
                })).response === 1) {
                    // Accept the detection to get a session, then immediately
                    // abort so that proper ZABORT frames are sent to the remote
                    // side, causing the remote rz/sz process to terminate.
                    try {
                        const zsession = detection.confirm()
                        zsession.abort()
                    } catch { }
                    // Clean up terminal output after rejection
                    this.showMessage(colors.bgRed.black(' Rejected ') + ' ZMODEM session')
                    return
                }

                try {
                    this.isActive = true
                    await this.process(detection)
                } finally {
                    this.isActive = false
                }
            },
            on_retract: () => {
                this.showMessage('transfer cancelled')
                this.activeSession = null
                this.isActive = false
            },
        })
    }

    feedFromSession (data: Buffer): void {
        if (this.isActive || this.activeSession) {
            try {
                this.sentry.consume(data)
            } catch (e) {
                this.showMessage(colors.bgRed.black(' Error ') + ' ' + e)
                this.logger.error('protocol error', e)
                this.activeSession?.abort()
                this.activeSession = null
                this.isActive = false
                // Don't forward the problematic data to terminal
                return
            }
        } else {
            // No active session: sentry.consume() routes everything straight
            // back through to_terminal, so we must not output here as well or
            // the data would be duplicated. Only on a consume() failure do we
            // forward the raw data as a fallback so nothing is lost.
            try {
                this.sentry.consume(data)
            } catch (e) {
                this.logger.error('zmodem detection error', e)
                this.outputToTerminal.next(data)
            }
        }
    }

    private async process (detection): Promise<void> {
        this.showMessage(colors.bgBlue.black(' ZMODEM ') + ' Session started')
        this.showMessage('------------------------')

        const zsession = detection.confirm()
        this.activeSession = zsession
        this.logger.info('new session', zsession)

        try {
            if (zsession.type === 'send') {
                const transfers = await this.platform.startUpload({ multiple: true })
                let filesRemaining = transfers.length
                let sizeRemaining = transfers.reduce((a, b) => a + b.getSize(), 0)
                for (const transfer of transfers) {
                    await this.sendFile(zsession, transfer, filesRemaining, sizeRemaining)
                    filesRemaining--
                    sizeRemaining -= transfer.getSize()
                }
                await zsession.close()

                this.showMessage(colors.bgBlue.black(' ZMODEM ') + ' Complete')
            } else {
                const pendingReceives: Promise<void>[] = []
                zsession.on('offer', xfer => {
                    pendingReceives.push(this.receiveFile(xfer, zsession))
                })

                // session_end fires synchronously inside sentry.consume(),
                // immediately before the session's trailing bytes (the shell
                // prompt redrawn after sz exits) are flushed via to_terminal.
                // Start buffering here so those bytes are held back until after
                // all "Received" messages and the "Complete" message have been
                // printed; otherwise the prompt would be emitted first and then
                // overwritten by showMessage()'s leading "\r".
                zsession.on('session_end', () => {
                    this.trailingBuffer = []
                })

                zsession.start()

                await new Promise(resolve => zsession.on('session_end', resolve))
                await Promise.all(pendingReceives)

                this.showMessage(colors.bgBlue.black(' ZMODEM ') + ' Complete')
                this.flushTrailingBuffer()
            }
        } catch (error) {
            this.logger.error('ZMODEM session error', error)
            this.showMessage(colors.bgRed.black(' ZMODEM ') + ` Session failed: ${error.message}`)
            try {
                zsession.abort()
            } catch { }
        } finally {
            this.activeSession = null

            // Safety net: if an error left bytes buffered (e.g. session_end
            // started buffering but the flush above was skipped), release them
            // so terminal output is never permanently swallowed.
            if (this.trailingBuffer) {
                this.flushTrailingBuffer()
            }
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

        let writeQueue: Promise<void> = Promise.resolve()
        let receivedBytes = 0
        let lastUpdateTime = 0

        try {
            await Promise.race([
                xfer.accept({
                    on_input: chunk => {
                        if (canceled) {
                            return
                        }

                        receivedBytes += chunk.length
                        const now = Date.now()
                        if (now - lastUpdateTime > 500) {
                            lastUpdateTime = now
                            const percent = Math.round(100 * receivedBytes / details.size)
                            const percentStr = percent.toString().padStart(3, ' ')
                            this.showMessage(colors.bgYellow.black(` ${percentStr}% `) + ' ' + details.name, true)
                        }

                        writeQueue = writeQueue
                            .then(() => transfer.write(Buffer.from(chunk)))
                            .catch(err => {
                                this.logger.error('Zmodem write error', err)
                            })
                    },
                }),
                this.cancelEvent.pipe(first()).toPromise(),
            ])

            await writeQueue

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
    #injector = inject(EnvironmentInjector)

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
        terminal.session.middleware.unshift(this.#injector.runInContext(() => new ZModemMiddleware()))
    }
}
