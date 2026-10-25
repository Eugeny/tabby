import * as os from 'os'
import { Subject, Observable } from 'rxjs'
import { SessionMiddleware } from '../api/middleware'

const ESC = 0x1b
const BEL = 0x07
const CAN = 0x18
const SUB = 0x1a
const OSC_INTRODUCER = 0x5d // ESC ]
const ST_FINAL = 0x5c // ESC \

const ESC_BUFFER = Buffer.from([ESC])
const BEL_BUFFER = Buffer.from([BEL])
const OSC_PREFIX = Buffer.from([ESC, OSC_INTRODUCER])

/** OSC codes handled here - all other sequences stream straight through to the frontend */
const HANDLED_OSC_CODES = new Set([9, 52, 99, 777, 1337])

/** Handled OSC sequences with a longer payload are passed through to the frontend instead */
const MAX_OSC_LENGTH = 8 * 1024 * 1024

/** Highest ConEmu OSC 9 subcommand - an OSC 9 that starts with one of these isn't an iTerm2 notification */
const MAX_CONEMU_SUBCOMMAND = 12

/** Limits for kitty notifications sent in several chunks */
const MAX_PENDING_KITTY_NOTIFICATIONS = 16
const MAX_KITTY_NOTIFICATION_FIELD_LENGTH = 8 * 1024

export interface TerminalNotification {
    title?: string
    body: string
    /** Identifier the program can refer to the notification by (OSC 99 only) */
    id?: string
    /** When to show it - `unfocused` unless the program asks for less */
    occasion: 'unfocused' | 'invisible'
    /** Whether clicking it should focus the terminal */
    focusOnClick: boolean
    /** Whether a click should be reported back to the program */
    reportClick: boolean
}

export interface TerminalProgress {
    state: 'normal' | 'error' | 'indeterminate' | 'paused'
    /** Percentage between 0 and 100, null if indeterminate */
    value: number | null
}

type ParserState = 'ground' | 'escape' | 'osc' | 'oscPassthrough'

function isOSCTerminator (byte: number): boolean {
    return byte === BEL || byte === ESC || byte === CAN || byte === SUB
}

export class OSCProcessor extends SessionMiddleware {
    get cwdReported$ (): Observable<string> { return this.cwdReported }
    get copyRequested$ (): Observable<string> { return this.copyRequested }
    /** Desktop notification requested via OSC 9 (iTerm2), OSC 777 (rxvt) or OSC 99 (kitty) */
    get notificationRequested$ (): Observable<TerminalNotification> { return this.notificationRequested }
    /** ID of an OSC 99 notification the program asked to close */
    get notificationCloseRequested$ (): Observable<string> { return this.notificationCloseRequested }
    /** Progress reported via OSC 9;4 (ConEmu / Windows Terminal), null when cleared */
    get progressReported$ (): Observable<TerminalProgress|null> { return this.progressReported }

    private cwdReported = new Subject<string>()
    private copyRequested = new Subject<string>()
    private notificationRequested = new Subject<TerminalNotification>()
    private notificationCloseRequested = new Subject<string>()
    private progressReported = new Subject<TerminalProgress|null>()
    private pendingKittyNotifications = new Map<string, TerminalNotification>()
    private lastProgressValue = 0

    private state: ParserState = 'ground'
    /** The ESC that put the parser into the `escape` state ended the previous chunk and hasn't been passed on yet */
    private escapeHeld = false
    /** A handled OSC ended with ESC, so a following `\` completes its ST and is dropped too */
    private swallowST = false
    private oscChunks: Buffer[] = []
    private oscLength = 0
    private oscCodeDigits = ''
    private oscCode: number | null = null

    /**
     * Streams the output through a minimal VT parser that only buffers the payload of the OSC sequences it handles.
     * Like xterm.js, an OSC ends at BEL or ESC (normally the start of `ESC \`) and is aborted by CAN or SUB.
     */
    feedFromSession (data: Buffer): void {
        if (!data.length) {
            return
        }
        const output: Buffer[] = []
        // Start of the data that is passed through as is
        let passStart = 0
        let i = 0

        while (i < data.length) {
            if (this.state === 'ground') {
                const escIndex = data.indexOf(ESC, i)
                if (escIndex === -1) {
                    break
                }
                this.state = 'escape'
                i = escIndex + 1
            } else if (this.state === 'escape') {
                // The ESC is at i - 1, or ended the previous chunk if escapeHeld
                const byte = data[i]
                if (byte === OSC_INTRODUCER || byte === ST_FINAL && this.swallowST) {
                    if (i - 1 > passStart) {
                        output.push(data.subarray(passStart, i - 1))
                    }
                    this.escapeHeld = false
                    this.swallowST = false
                    i++
                    passStart = i
                    if (byte === OSC_INTRODUCER) {
                        this.state = 'osc'
                        this.oscChunks = []
                        this.oscLength = 0
                        this.oscCodeDigits = ''
                        this.oscCode = null
                    } else {
                        this.state = 'ground'
                    }
                } else {
                    if (this.escapeHeld) {
                        output.push(ESC_BUFFER)
                        this.escapeHeld = false
                    }
                    this.swallowST = false
                    if (byte === ESC) {
                        i++
                    } else {
                        this.state = 'ground'
                    }
                }
            } else {
                let end = i
                while (end < data.length && !isOSCTerminator(data[end])) {
                    end++
                }

                if (this.state === 'osc') {
                    this.collectOSC(data.subarray(i, end))
                    if (!this.shouldHandleOSC(end < data.length)) {
                        // Hand what was collected so far to the frontend and stream the rest
                        output.push(OSC_PREFIX, ...this.oscChunks)
                        this.oscChunks = []
                        this.state = 'oscPassthrough'
                        passStart = end
                    } else if (end < data.length) {
                        this.endOSC(data[end], output)
                        // An ESC terminator starts the next escape sequence
                        passStart = data[end] === ESC ? end : end + 1
                    } else {
                        passStart = end
                    }
                }

                if (end < data.length) {
                    this.state = data[end] === ESC ? 'escape' : 'ground'
                    end++
                }
                i = end
            }
        }

        if (this.state === 'escape') {
            // Hold back a trailing ESC in case the next chunk starts with `]`
            output.push(data.subarray(passStart, data.length - 1))
            this.escapeHeld = true
        } else if (this.state !== 'osc') {
            output.push(data.subarray(passStart))
        }

        const processed = output.filter(x => x.length)
        if (processed.length > 0) {
            super.feedFromSession(processed.length === 1 ? processed[0] : Buffer.concat(processed))
        }
    }

    /** Tells the program that its OSC 99 notification was clicked */
    reportNotificationClick (id: string|undefined): void {
        this.outputToSession.next(Buffer.from(`\x1b]99;i=${id ?? '0'};\x1b\\`))
    }

    close (): void {
        this.cwdReported.complete()
        this.copyRequested.complete()
        this.notificationRequested.complete()
        this.notificationCloseRequested.complete()
        this.progressReported.complete()
        super.close()
    }

    private collectOSC (chunk: Buffer): void {
        if (!chunk.length) {
            return
        }
        this.oscChunks.push(chunk)
        this.oscLength += chunk.length
        for (let i = 0; this.oscCode === null && i < chunk.length; i++) {
            const byte = chunk[i]
            if (byte >= 0x30 && byte <= 0x39 && this.oscCodeDigits.length < 8) {
                this.oscCodeDigits += String.fromCharCode(byte)
            } else {
                // A code that isn't followed by `;` can't be one of ours
                this.oscCode = byte === 0x3b && this.oscCodeDigits ? parseInt(this.oscCodeDigits) : -1
            }
        }
    }

    private endOSC (terminator: number, output: Buffer[]): void {
        const chunks = this.oscChunks
        this.oscChunks = []
        if (terminator === CAN || terminator === SUB) {
            return
        }
        const payload = Buffer.concat(chunks)
        if (this.handleOSC(payload.toString())) {
            this.swallowST = terminator === ESC
        } else {
            output.push(OSC_PREFIX, payload)
            if (terminator === BEL) {
                output.push(BEL_BUFFER)
            }
        }
    }

    /** Whether the OSC being collected is one of ours and still worth buffering */
    private shouldHandleOSC (ended: boolean): boolean {
        if (this.oscLength > MAX_OSC_LENGTH) {
            return false
        }
        if (this.oscCode === null) {
            return !ended
        }
        return HANDLED_OSC_CODES.has(this.oscCode)
    }

    /** Returns false if the sequence should still reach the frontend */
    private handleOSC (oscString: string): boolean {
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
            // `?` asks for the clipboard contents, which programs aren't allowed to read
            if ((oscParams[0] === 'c' || oscParams[0] === '') && oscParams[1] !== '?') {
                const content = Buffer.from(oscParams[1] ?? '', 'base64')
                this.copyRequested.next(content.toString())
            }
        } else if (oscCode === 9) {
            return this.handleOSC9(oscParams)
        } else if (oscCode === 777) {
            if (oscParams[0] === 'notify') {
                this.notificationRequested.next({
                    title: oscParams[1],
                    body: oscParams.slice(2).join(';'),
                    occasion: 'unfocused',
                    focusOnClick: true,
                    reportClick: false,
                })
            }
        } else if (oscCode === 99) {
            this.handleKittyNotification(oscParams[0] ?? '', oscParams.slice(1).join(';'))
        } else {
            return false
        }
        return true
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
            this.handleProgress(params[1], params[2])
            return true
        }
        const body = params.join(';')
        if (body) {
            this.notificationRequested.next({ body, occasion: 'unfocused', focusOnClick: true, reportClick: false })
        }
        return true
    }

    /**
     * 9;4;<state>;<progress> - state 0: clear, 1: set, 2: error, 3: indeterminate, 4: paused.
     * Error and paused keep the last percentage if they don't come with one.
     */
    private handleProgress (stateParam: string|undefined, progressParam: string|undefined): void {
        const state = parseInt(stateParam ?? '')
        let value = parseInt(progressParam ?? '')
        if (!isNaN(value)) {
            value = Math.min(Math.max(value, 0), 100)
        }
        if (state === 0) {
            this.lastProgressValue = 0
            this.progressReported.next(null)
        } else if (state === 3) {
            this.progressReported.next({ state: 'indeterminate', value: null })
        } else if (state === 1 || state === 2 || state === 4) {
            if (isNaN(value)) {
                value = state === 1 ? 0 : this.lastProgressValue
            }
            this.lastProgressValue = value
            this.progressReported.next({
                state: state === 1 ? 'normal' : state === 2 ? 'error' : 'paused',
                value,
            })
        }
    }

    /**
     * OSC 99;<metadata>;<payload> - metadata is a `:`-separated list of `key=value`.
     * A notification may be split across several sequences sharing an `i` id, with `d=0` on all but the last.
     * See https://sw.kovidgoyal.net/kitty/desktop-notifications/
     */
    private handleKittyNotification (metadata: string, payload: string): void {
        const options = new Map<string, string>()
        for (const pair of metadata.split(':')) {
            const [key, ...value] = pair.split('=')
            if (key) {
                options.set(key, value.join('='))
            }
        }

        // Identifiers are echoed back to the program, so only keep the characters the spec allows
        const id = (options.get('i') ?? '').replace(/[^a-zA-Z0-9_\-+.]/g, '')
        const payloadType = options.get('p') ?? 'title'

        if (payloadType === '?') {
            const idKey = id ? `i=${id}:` : ''
            this.outputToSession.next(Buffer.from(`\x1b]99;${idKey}p=?;a=focus,report:o=unfocused,invisible:p=title,body,close,?\x1b\\`))
            return
        }
        if (payloadType === 'close') {
            if (id) {
                this.pendingKittyNotifications.delete(id)
                this.notificationCloseRequested.next(id)
            }
            return
        }
        if (payloadType !== 'title' && payloadType !== 'body') {
            // Icons, buttons and alive queries aren't supported
            return
        }
        if (options.get('e') === '1') {
            payload = Buffer.from(payload, 'base64').toString()
        }

        let notification = this.pendingKittyNotifications.get(id)
        if (!notification) {
            notification = { title: '', body: '', occasion: 'unfocused', focusOnClick: true, reportClick: false }
            if (id) {
                notification.id = id
            }
        }
        const field = payloadType === 'title' ? 'title' : 'body'
        notification[field] = ((notification[field] ?? '') + payload).substring(0, MAX_KITTY_NOTIFICATION_FIELD_LENGTH)

        if (options.has('o')) {
            notification.occasion = options.get('o') === 'invisible' ? 'invisible' : 'unfocused'
        }
        if (options.has('a')) {
            for (const action of options.get('a')!.split(',')) {
                const enable = !action.startsWith('-')
                const name = enable ? action : action.substring(1)
                if (name === 'focus') {
                    notification.focusOnClick = enable
                } else if (name === 'report') {
                    notification.reportClick = enable
                }
            }
        }

        // Re-insert so that the map stays ordered by the latest update
        this.pendingKittyNotifications.delete(id)
        if (options.get('d') === '0') {
            this.pendingKittyNotifications.set(id, notification)
            if (this.pendingKittyNotifications.size > MAX_PENDING_KITTY_NOTIFICATIONS) {
                this.pendingKittyNotifications.delete(this.pendingKittyNotifications.keys().next().value!)
            }
            return
        }
        if (!notification.title && !notification.body) {
            return
        }
        if (!notification.body) {
            notification.body = notification.title!
            delete notification.title
        }
        this.notificationRequested.next(notification)
    }
}
