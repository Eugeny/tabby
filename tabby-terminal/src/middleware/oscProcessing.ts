import * as os from 'os'
import { Subject, Observable } from 'rxjs'
import { SessionMiddleware } from '../api/middleware'

const OSCPrefix = Buffer.from('\x1b]')
const OSCSuffixes = [Buffer.from('\x07'), Buffer.from('\x1b\\')]

export class OSCProcessor extends SessionMiddleware {
    get cwdReported$ (): Observable<string> { return this.cwdReported }
    get copyRequested$ (): Observable<string> { return this.copyRequested }

    private cwdReported = new Subject<string>()
    private buffer: Buffer | null = null
    private copyRequested = new Subject<string>()

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
                // No suffix found - buffer the rest and wait for next chunk
                this.buffer = data.subarray(prefixIndex)
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
