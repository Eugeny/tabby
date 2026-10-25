import * as os from 'os'
import { Subject, Observable } from 'rxjs'
import { SessionMiddleware } from '../api/middleware'

const OSCPrefix = Buffer.from('\x1b]')
const OSCSuffixes = [Buffer.from('\x07'), Buffer.from('\x1b\\')]

/** Highest ConEmu OSC 9 subcommand - an OSC 9 that starts with one of these isn't an iTerm2 notification */
const MAX_CONEMU_SUBCOMMAND = 12

export interface TerminalNotification {
    title?: string
    body: string
}

interface KittyNotificationChunk {
    title: string
    body: string
}

export class OSCProcessor extends SessionMiddleware {
    get cwdReported$ (): Observable<string> { return this.cwdReported }
    get copyRequested$ (): Observable<string> { return this.copyRequested }
    /** Desktop notification requested via OSC 9 (iTerm2), OSC 777 (rxvt) or OSC 99 (kitty) */
    get notificationRequested$ (): Observable<TerminalNotification> { return this.notificationRequested }
    /** Progress reported via OSC 9;4 (ConEmu / Windows Terminal), null when cleared */
    get progressReported$ (): Observable<number|null> { return this.progressReported }

    private cwdReported = new Subject<string>()
    private buffer: Buffer | null = null
    private copyRequested = new Subject<string>()
    private notificationRequested = new Subject<TerminalNotification>()
    private progressReported = new Subject<number|null>()
    private pendingKittyNotifications = new Map<string, KittyNotificationChunk>()

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
                if (!this.handleOSC9(oscParams)) {
                    processedData.push(data.subarray(prefixIndex, foundSuffix[1] + foundSuffix[0].length))
                }
            } else if (oscCode === 777) {
                if (oscParams[0] === 'notify') {
                    this.notificationRequested.next({
                        title: oscParams[1],
                        body: oscParams.slice(2).join(';'),
                    })
                }
            } else if (oscCode === 99) {
                this.handleKittyNotification(oscParams[0] ?? '', oscParams.slice(1).join(';'))
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
        this.notificationRequested.complete()
        this.progressReported.complete()
        super.close()
    }

    /**
     * OSC 9 is overloaded: ConEmu uses `9;<n>;...` subcommands, iTerm2 uses `9;<message>`.
     * Returns false for ConEmu subcommands that aren't handled here so they reach the frontend.
     */
    private handleOSC9 (params: string[]): boolean {
        const subcommand = /^\d+$/.test(params[0] ?? '') ? parseInt(params[0]) : null
        if (params.length > 1 && subcommand !== null && subcommand >= 1 && subcommand <= MAX_CONEMU_SUBCOMMAND) {
            if (subcommand !== 4) {
                return false
            }
            // 9;4;<state>;<progress> - state 0: clear, 1: set, 2: error, 3: indeterminate, 4: paused
            const state = parseInt(params[1])
            const progress = parseInt(params[2])
            if (state === 0) {
                this.progressReported.next(null)
            } else if ([1, 2, 4].includes(state) && !isNaN(progress)) {
                this.progressReported.next(Math.min(Math.max(progress, 0), 100))
            }
            return true
        }
        const body = params.join(';')
        if (body) {
            this.notificationRequested.next({ body })
        }
        return true
    }

    /**
     * OSC 99;<metadata>;<payload> - metadata is a `:`-separated list of `key=value`.
     * A notification may be split across several sequences sharing an `i` id, with `d=0` on all but the last.
     */
    private handleKittyNotification (metadata: string, payload: string): void {
        const options = new Map<string, string>()
        for (const pair of metadata.split(':')) {
            const [key, ...value] = pair.split('=')
            if (key) {
                options.set(key, value.join('='))
            }
        }

        const payloadType = options.get('p') ?? 'title'
        if (payloadType !== 'title' && payloadType !== 'body') {
            // Capability queries, icons, buttons etc. aren't supported
            return
        }
        if (options.get('e') === '1') {
            payload = Buffer.from(payload, 'base64').toString()
        }

        const id = options.get('i') ?? ''
        const chunk = this.pendingKittyNotifications.get(id) ?? { title: '', body: '' }
        chunk[payloadType] += payload

        if (options.get('d') === '0') {
            this.pendingKittyNotifications.set(id, chunk)
            return
        }
        this.pendingKittyNotifications.delete(id)
        if (chunk.title || chunk.body) {
            this.notificationRequested.next(chunk.body ? chunk : { body: chunk.title })
        }
    }
}
