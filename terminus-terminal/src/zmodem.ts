/* eslint-disable @typescript-eslint/camelcase */
import * as ZModem from 'zmodem.js'
import * as fs from 'fs'
import * as path from 'path'
import { Subscription } from 'rxjs'
import { Injectable } from '@angular/core'
import { TerminalDecorator } from './api/decorator'
import { TerminalTabComponent } from './components/terminalTab.component'
import { LogService, Logger, ElectronService, HostAppService } from 'terminus-core'

const SPACER = '            '

/** @hidden */
@Injectable()
export class ZModemDecorator extends TerminalDecorator {
    private subscriptions: Subscription[] = []
    private logger: Logger
    private sentry
    private activeSession: any = null

    constructor (
        log: LogService,
        private electron: ElectronService,
        private hostApp: HostAppService,
    ) {
        super()
        this.logger = log.create('zmodem')
    }

    attach (terminal: TerminalTabComponent): void {
        this.sentry = new ZModem.Sentry({
            to_terminal: () => null,
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
            this.subscriptions = [
                terminal.session.binaryOutput$.subscribe(data => {
                    const chunkSize = 1024
                    for (let i = 0; i <= Math.floor(data.length / chunkSize); i++) {
                        try {
                            this.sentry.consume(data.subarray(i * chunkSize, (i + 1) * chunkSize))
                        } catch (e) {
                            this.logger.error('protocol error', e)
                            this.activeSession.abort()
                            this.activeSession = null
                            terminal.enablePassthrough = true
                            return
                        }
                    }
                }),
            ]
        })
    }

    async process (terminal, detection) {
        this.showMessage(terminal, '[Terminus] ZModem session started')
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
                this.receiveFile(terminal, xfer)
            })

            zsession.start()

            await new Promise(resolve => zsession.on('session_end', resolve))
            this.activeSession = null
        }
    }

    detach (_terminal: TerminalTabComponent): void {
        for (const s of this.subscriptions) {
            s.unsubscribe()
        }
    }

    private async receiveFile (terminal, xfer) {
        const details = xfer.get_details()
        this.showMessage(terminal, `🟡 Offered ${details.name}`, true)
        this.logger.info('offered', xfer)
        const result = await this.electron.dialog.showSaveDialog(
            this.hostApp.getWindow(),
            {
                defaultPath: details.name,
            },
        )
        if (!result.filePath) {
            this.showMessage(terminal, `🔴 Rejected ${details.name}`)
            xfer.skip()
            return
        }
        const stream = fs.createWriteStream(result.filePath)
        let bytesSent = 0
        await xfer.accept({
            on_input: chunk => {
                stream.write(Buffer.from(chunk))
                bytesSent += chunk.length
                this.showMessage(terminal, `🟡 Receiving ${details.name}: ${Math.round(100 * bytesSent / details.size)}%`, true)
            },
        })
        this.showMessage(terminal, `✅ Received ${details.name}`)
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
        this.showMessage(terminal, `🟡 Offering ${offer.name}`, true)

        const xfer = await zsession.send_offer(offer)
        if (xfer) {
            let bytesSent = 0
            const stream = fs.createReadStream(filePath)
            stream.on('data', chunk => {
                xfer.send(chunk)
                bytesSent += chunk.length
                this.showMessage(terminal, `🟡 Sending ${offer.name}: ${Math.round(100 * bytesSent / offer.size)}%`, true)
            })
            await new Promise(resolve => stream.on('end', resolve))
            await xfer.end()
            stream.close()
            this.showMessage(terminal, `✅ Sent ${offer.name}`)
        } else {
            this.showMessage(terminal, `🔴 Other side rejected ${offer.name}`)
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
