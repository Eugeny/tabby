import * as os from 'os'
import { Subject, Observable } from 'rxjs'
import { SessionMiddleware } from '../api/middleware'

const OSCPrefix = Buffer.from('\x1b]')
const OSCSuffixes = [Buffer.from('\x07'), Buffer.from('\x1b\\')]

/** OSC 9;4 progress states, as defined by ConEmu and Windows Terminal. */
export type OSC94State = 0 | 1 | 2 | 3 | 4

export interface OSC94Progress {
    state: OSC94State
    /** Percentage in the 0-100 range for states 1, 2 and 4; null otherwise. */
    progress: number|null
}

/**
 * Parses the payload of an OSC 9;4 sequence (for example `9;4;1;50`).
 * Returns null when the payload is not a valid progress report.
 */
export function parseOSC94Progress (payload: string): OSC94Progress|null {
    const [code, subCode, stateString, progressString] = payload.split(';')
    if (code !== '9' || subCode !== '4') {
        return null
    }
    const state = Number(stateString)
    if (!Number.isInteger(state) || state < 0 || state > 4) {
        return null
    }
    if (state === 0 || state === 3) {
        return { state: state as OSC94State, progress: null }
    }
    const percentage = Number(progressString)
    if (!Number.isFinite(percentage)) {
        return null
    }
    return {
        state: state as OSC94State,
        progress: Math.max(0, Math.min(100, percentage)),
    }
}

export class OSCProcessor extends SessionMiddleware {
    get cwdReported$ (): Observable<string> { return this.cwdReported }
    get copyRequested$ (): Observable<string> { return this.copyRequested }
    get progressReported$ (): Observable<OSC94Progress> { return this.progressReported }

    private cwdReported = new Subject<string>()
    private buffer: Buffer | null = null
    private copyRequested = new Subject<string>()
    private progressReported = new Subject<OSC94Progress>()

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
            } else if (oscCode === 9) {
                const progress = parseOSC94Progress(oscString)
                if (progress) {
                    this.progressReported.next(progress)
                } else {
                    // Other OSC 9 sequences (e.g. notifications) are not ours - let them through
                    processedData.push(data.subarray(prefixIndex, foundSuffix[1] + foundSuffix[0].length))
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
        this.progressReported.complete()
        super.close()
    }
}
