import colors from 'ansi-colors'
import * as ZModem from 'zmodem.js'
import { Observable, filter, first } from 'rxjs'
import { Injectable } from '@angular/core'
import { TerminalDecorator } from '../api/decorator'
import { BaseTerminalTabComponent } from '../api/baseTerminalTab.component'
import { SessionMiddleware } from '../api/middleware'
import { LogService, Logger, HotkeysService, PlatformService, FileUpload } from 'tabby-core'

const SPACER = '            '

// Helper function to detect and filter ANSI escape sequences
function filterAnsiEscapeSequences (data: Buffer): Buffer {
    const result: number[] = []
    let i = 0

    while (i < data.length) {
        // Check for ESC character (27)
        if (data[i] === 27 && i + 1 < data.length) {
            // Handle different types of escape sequences
            if (data[i + 1] === 91) { // ESC[
                // CSI (Control Sequence Introducer) sequences
                i += 2
                // Skip parameters (digits, semicolons, spaces)
                while (i < data.length &&
                       (data[i] >= 48 && data[i] <= 57 || // 0-9
                        data[i] === 59 || // semicolon
                        data[i] === 32 || // space
                        data[i] === 63 || // question mark
                        data[i] === 33 || // exclamation mark
                        data[i] === 62 || // greater than
                        data[i] === 61)) { // equals
                    i++
                }
                // Skip the final command character (letter)
                if (i < data.length &&
                    (data[i] >= 65 && data[i] <= 90 || // A-Z
                     data[i] >= 97 && data[i] <= 122)) { // a-z
                    i++
                }
            } else if (data[i + 1] === 93) { // ESC]
                // OSC (Operating System Command) sequences
                i += 2
                // Skip until we find BEL (7) or ESC\ (27, 92)
                while (i < data.length) {
                    if (data[i] === 7) { // BEL
                        i++
                        break
                    } else if (data[i] === 27 && i + 1 < data.length && data[i + 1] === 92) { // ESC\
                        i += 2
                        break
                    }
                    i++
                }
            } else if (data[i + 1] >= 64 && data[i + 1] <= 95) {
                // Two-character escape sequences (ESC followed by 0x40-0x5F)
                i += 2
            } else {
                // Unknown escape sequence, keep the ESC character
                result.push(data[i])
                i++
            }
        } else {
            result.push(data[i])
            i++
        }
    }

    return Buffer.from(result)
}

class ZModemMiddleware extends SessionMiddleware {
    private sentry: ZModem.Sentry
    private isActive = false
    private logger: Logger
    private activeSession: any = null
    private cancelEvent: Observable<any>
    private protocolBuffer: Buffer = Buffer.alloc(0)

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
        // If Zmodem is not active, pass through normally and let sentry detect protocol start
        if (!this.isActive) {
            try {
                this.sentry.consume(data)
            } catch (e) {
                this.logger.debug('sentry consume error (inactive):', e)
            }
            this.outputToTerminal.next(data)
            return
        }

        // When Zmodem is active, we need to be more careful about data filtering
        let processedData = data

        // Filter out ANSI escape sequences that might interfere with protocol
        if (data.includes(27)) { // ESC character present
            const filtered = filterAnsiEscapeSequences(data)
            if (filtered.length !== data.length) {
                this.logger.debug('Filtered ANSI sequences from Zmodem data', {
                    original: data.length,
                    filtered: filtered.length,
                    originalHex: data.toString('hex'),
                    filteredHex: filtered.toString('hex'),
                })
                processedData = filtered
            }
        }

        // Special handling for the ZFIN "OO" issue
        // If we detect what looks like shell prompt data mixed with protocol data,
        // try to extract only the protocol-relevant parts
        if (processedData.length > 2) {
            // Look for the "OO" pattern (79, 79) that should follow ZFIN
            const ooIndex = processedData.indexOf(Buffer.from([79, 79]))
            if (ooIndex >= 0) {
                // If we found "OO", only keep data up to and including it
                processedData = processedData.slice(0, ooIndex + 2)
                this.logger.debug('Truncated data after ZFIN OO pattern')
            }
        }

        // Add to protocol buffer for processing
        this.protocolBuffer = Buffer.concat([this.protocolBuffer, processedData])

        // Process in chunks, but be more conservative about error handling
        const chunkSize = 1024
        let processedBytes = 0

        while (processedBytes < this.protocolBuffer.length) {
            const chunkEnd = Math.min(processedBytes + chunkSize, this.protocolBuffer.length)
            const chunk = this.protocolBuffer.slice(processedBytes, chunkEnd)

            try {
                this.sentry.consume(chunk)
                processedBytes = chunkEnd
            } catch (e) {
                this.logger.error('protocol error', e, {
                    chunk: Array.from(chunk),
                    chunkString: chunk.toString('hex'),
                })

                // Try to recover by filtering and retrying
                if (chunk.length > 1) {
                    // First, try filtering ANSI sequences again more aggressively
                    const refiltered = filterAnsiEscapeSequences(chunk)
                    if (refiltered.length !== chunk.length) {
                        try {
                            this.sentry.consume(refiltered)
                            processedBytes = chunkEnd
                            this.logger.debug('Recovered by re-filtering ANSI sequences')
                            continue
                        } catch (refilteredError) {
                            this.logger.debug('Re-filtering did not help:', refilteredError)
                        }
                    }

                    // If that doesn't work, try byte-by-byte processing
                    let recoveredBytes = 0
                    for (const [i, byte] of chunk.entries()) {
                        try {
                            this.sentry.consume(chunk.slice(i, i + 1))
                            recoveredBytes++
                        } catch (innerE) {
                            this.logger.debug('Skipping problematic byte:', byte, 'hex:', byte.toString(16))
                            // Skip this byte and continue
                        }
                    }

                    if (recoveredBytes > 0) {
                        processedBytes = chunkEnd
                        this.logger.debug(`Recovered ${recoveredBytes}/${chunk.length} bytes`)
                        continue
                    }
                }

                // If all recovery attempts fail, abort the session
                this.logger.error('Unable to recover from protocol error, aborting session')
                this.showMessage(colors.bgRed.black(' Protocol Error ') + ' Unable to recover from corrupted data')
                this.activeSession?.abort()
                this.activeSession = null
                this.isActive = false
                this.protocolBuffer = Buffer.alloc(0)
                return
            }
        }

        // Clear processed data from buffer
        this.protocolBuffer = Buffer.alloc(0)
    }

    private async process (detection): Promise<void> {
        this.showMessage(colors.bgBlue.black(' ZMODEM ') + ' Session started')
        this.showMessage('------------------------')

        const zsession = detection.confirm()
        this.activeSession = zsession
        this.protocolBuffer = Buffer.alloc(0) // Clear any buffered data
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
            } else {
                zsession.on('offer', xfer => {
                    this.receiveFile(xfer, zsession)
                })

                zsession.start()

                await new Promise(resolve => zsession.on('session_end', resolve))
            }
        } catch (error) {
            this.logger.error('Zmodem session error:', error)
            this.showMessage(colors.bgRed.black(' Session Error ') + ' ' + error)
        } finally {
            this.activeSession = null
            this.protocolBuffer = Buffer.alloc(0)
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
                        try {
                            transfer.write(Buffer.from(chunk))
                            this.showMessage(colors.bgYellow.black(' ' + Math.round(100 * transfer.getCompletedBytes() / details.size).toString().padStart(3, ' ') + '% ') + ' ' + details.name, true)
                        } catch (writeError) {
                            this.logger.error('Error writing file chunk:', writeError)
                            canceled = true
                        }
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
        } catch (error) {
            this.logger.error('File transfer error:', error)
            this.showMessage(colors.bgRed.black(' Error ') + ' ' + details.name + ': ' + error)
            transfer.cancel()
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
