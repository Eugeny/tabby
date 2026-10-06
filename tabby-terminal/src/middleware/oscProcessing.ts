import * as os from 'os'
import { Subject, Observable } from 'rxjs'
import { Logger } from 'tabby-core'
import { SessionMiddleware } from '../api/middleware'

const OSCPrefix = Buffer.from('\x1b]')
const OSCSuffixes = [Buffer.from('\x07'), Buffer.from('\x1b\\')]
/** Longest OSC held back while waiting for its terminator */
const MAX_PENDING_OSC = 1024 * 1024

export class OSCProcessor extends SessionMiddleware {
    get cwdReported$ (): Observable<string> { return this.cwdReported }
    get copyRequested$ (): Observable<string> { return this.copyRequested }

    private cwdReported = new Subject<string>()
    private buffer: Buffer | null = null
    private copyRequested = new Subject<string>()
    private warnedUnterminated = false

    constructor (private logger?: Logger) {
        super()
    }

    feedFromSession (data: Buffer): void {
        // Prepend any buffered data from previous chunks
        if (this.buffer) {
            data = Buffer.concat([this.buffer, data])
            this.buffer = null
        }

        let startIndex = 0
        const processedData: Buffer[] = []

        while (startIndex < data.length) {
            const prefixIndex = data.indexOf(OSCPrefix, startIndex)

            if (prefixIndex === -1) {
                // No more OSC sequences, pass remaining data
                if (startIndex < data.length) {
                    processedData.push(data.subarray(startIndex))
                }
                break
            }

            // Pass data before this OSC sequence
            if (prefixIndex > startIndex) {
                processedData.push(data.subarray(startIndex, prefixIndex))
            }

            // Look for suffix after the prefix
            const suffixSearchStart = prefixIndex + OSCPrefix.length
            let foundSuffix: [Buffer, number] | null = null

            for (const suffix of OSCSuffixes) {
                const suffixIndex = data.indexOf(suffix, suffixSearchStart)
                if (suffixIndex !== -1) {
                    if (!foundSuffix || suffixIndex < foundSuffix[1]) {
                        foundSuffix = [suffix, suffixIndex]
                    }
                }
            }

            if (!foundSuffix) {
                // No terminator yet. Only keep waiting while this can still be a live OSC:
                // xterm aborts an OSC on CAN/SUB or on ESC not followed by '\\' (an ESC\\ here
                // would already have matched as the suffix). Anything else is passed through
                // untouched - holding it would swallow all further output and re-concatenate
                // the growing backlog on every chunk.
                const pending = data.subarray(prefixIndex)
                const esc = pending.indexOf(0x1b, OSCPrefix.length)
                const aborted = pending.length > MAX_PENDING_OSC
                    || esc !== -1 && esc + 1 < pending.length
                    || pending.indexOf(0x18, OSCPrefix.length) !== -1
                    || pending.indexOf(0x1a, OSCPrefix.length) !== -1
                if (aborted) {
                    if (!this.warnedUnterminated) {
                        this.warnedUnterminated = true
                        this.logger?.warn(`Unterminated OSC sequence (${pending.length} bytes held) - passing through`)
                    }
                    processedData.push(pending)
                    break
                }
                this.buffer = pending
                break
            }

            // Extract OSC string (between prefix and suffix)
            const oscString = data.subarray(suffixSearchStart, foundSuffix[1]).toString()
            const [oscCodeString, ...oscParams] = oscString.split(';')
            const oscCode = parseInt(oscCodeString)

            if (oscCode === 1337) {
                const paramString = oscParams.join(';')
                if (paramString.startsWith('CurrentDir=')) {
                    let reportedCWD = paramString.split('=', 2)[1]
                    if (reportedCWD.startsWith('~')) {
                        reportedCWD = os.homedir() + reportedCWD.substring(1)
                    }
                    this.cwdReported.next(reportedCWD)
                } else {
                    console.debug('Unsupported OSC 1337 parameter:', paramString)
                }
            } else if (oscCode === 52) {
                if (oscParams[0] === 'c' || oscParams[0] === '') {
                    const content = Buffer.from(oscParams[1], 'base64')
                    this.copyRequested.next(content.toString())
                }
            } else {
                processedData.push(data.subarray(prefixIndex, foundSuffix[1] + foundSuffix[0].length))
            }

            // Move past this OSC sequence
            startIndex = foundSuffix[1] + foundSuffix[0].length
        }

        // Pass through all processed data
        if (processedData.length > 0) {
            super.feedFromSession(Buffer.concat(processedData))
        }
    }

    close (): void {
        this.cwdReported.complete()
        this.copyRequested.complete()
        super.close()
    }
}
