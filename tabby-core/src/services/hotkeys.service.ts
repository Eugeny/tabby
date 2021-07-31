import { Injectable, Inject, NgZone, EventEmitter } from '@angular/core'
import { Observable, Subject } from 'rxjs'
import { HotkeyDescription, HotkeyProvider } from '../api/hotkeyProvider'
import { stringifyKeySequence, KeyEventData, KeySequenceItem } from './hotkeys.util'
import { ConfigService } from './config.service'
import { HostAppService, Platform } from '../api/hostApp'
import { deprecate } from 'util'

export interface PartialHotkeyMatch {
    id: string
    strokes: string[]
    matchedLength: number
}

const KEY_TIMEOUT = 2000


@Injectable({ providedIn: 'root' })
export class HotkeysService {
    key = new EventEmitter<KeyboardEvent>()

    /** @hidden */
    matchedHotkey = new EventEmitter<string>()

    /**
     * Fired for each recognized hotkey
     */
    get hotkey$ (): Observable<string> { return this._hotkey }

    /**
     * Fired for once hotkey is released
     */
    get hotkeyOff$ (): Observable<string> { return this._hotkeyOff }

    /**
     * Fired for each recognized hotkey
     */
    get key$ (): Observable<KeyboardEvent> { return this._key }

    private _hotkey = new Subject<string>()
    private _hotkeyOff = new Subject<string>()
    private _key = new Subject<KeyboardEvent>()
    private currentEvents: KeyEventData[] = []
    private disabledLevel = 0
    private hotkeyDescriptions: HotkeyDescription[] = []
    private pressedHotkey: string|null = null
    private lastMatchedHotkeyStartTime = performance.now()
    private lastMatchedHotkeyEndTime = performance.now()

    private constructor (
        private zone: NgZone,
        private config: ConfigService,
        @Inject(HotkeyProvider) private hotkeyProviders: HotkeyProvider[],
        hostApp: HostAppService,
    ) {
        const events = ['keydown', 'keyup']
        events.forEach(eventType => {
            document.addEventListener(eventType, (nativeEvent: KeyboardEvent) => {
                if (eventType === 'keyup' || document.querySelectorAll('input:focus').length === 0) {
                    this.pushKeystroke(eventType, nativeEvent)
                    if (hostApp.platform === Platform.Web) {
                        nativeEvent.preventDefault()
                        nativeEvent.stopPropagation()
                    }
                }
            })
        })
        this.config.ready$.toPromise().then(async () => {
            const hotkeys = await this.getHotkeyDescriptions()
            this.hotkeyDescriptions = hotkeys
        })

        // deprecated
        this.hotkey$.subscribe(h => this.matchedHotkey.emit(h))
        this.matchedHotkey.subscribe = deprecate(s => this.hotkey$.subscribe(s), 'matchedHotkey is deprecated, use hotkey$')

        this.key$.subscribe(e => this.key.emit(e))
    }

    /**
     * Adds a new key event to the buffer
     *
     * @param name DOM event name
     * @param nativeEvent event object
     */
    pushKeystroke (name: string, nativeEvent: KeyboardEvent): void {
        nativeEvent['event'] = name
        if (nativeEvent.timeStamp && this.currentEvents.find(x => x.time === nativeEvent.timeStamp)) {
            return
        }
        this.currentEvents.push({
            ctrlKey: nativeEvent.ctrlKey,
            metaKey: nativeEvent.metaKey,
            altKey: nativeEvent.altKey,
            shiftKey: nativeEvent.shiftKey,
            code: nativeEvent.code,
            key: nativeEvent.key,
            eventName: name,
            time: nativeEvent.timeStamp,
            registrationTime: performance.now(),
        })
        this.processKeystrokes()
        this.emitKeyEvent(nativeEvent)
    }

    /**
     * Check the buffer for new complete keystrokes
     */
    processKeystrokes (): void {
        if (this.isEnabled()) {
            this.zone.run(() => {
                let fullMatches: {
                    id: string,
                    sequence: string[],
                    startTime: number,
                    endTime: number,
                }[] = []

                const currentSequence = this.getCurrentKeySequence()
                const config = this.getHotkeysConfig()
                for (const id in config) {
                    for (const sequence of config[id]) {
                        if (currentSequence.length < sequence.length) {
                            continue
                        }
                        if (sequence.every(
                            (x: string, index: number) =>
                                x.toLowerCase() ===
                                    currentSequence[currentSequence.length - sequence.length + index].value.toLowerCase()
                        )) {
                            fullMatches.push({
                                id: id,
                                sequence,
                                startTime: currentSequence[currentSequence.length - sequence.length].firstEvent.registrationTime,
                                endTime: currentSequence[currentSequence.length - 1].lastEvent.registrationTime,
                            })
                        }
                    }
                }

                fullMatches.sort((a, b) => b.startTime - a.startTime + (b.sequence.length - a.sequence.length))
                fullMatches = fullMatches.filter(x => x.startTime >= this.lastMatchedHotkeyStartTime)
                fullMatches = fullMatches.filter(x => x.endTime > this.lastMatchedHotkeyEndTime)

                const matched = fullMatches[0]?.id
                if (matched) {
                    this.emitHotkeyOn(matched)
                    this.lastMatchedHotkeyStartTime = fullMatches[0].startTime
                    this.lastMatchedHotkeyEndTime = fullMatches[0].endTime
                } else if (this.pressedHotkey) {
                    this.emitHotkeyOff(this.pressedHotkey)
                }
            })
        }
    }

    private emitHotkeyOn (hotkey: string) {
        if (this.pressedHotkey) {
            this.emitHotkeyOff(this.pressedHotkey)
        }
        console.debug('Matched hotkey', hotkey)
        this._hotkey.next(hotkey)
        this.pressedHotkey = hotkey
    }

    private emitHotkeyOff (hotkey: string) {
        console.debug('Unmatched hotkey', hotkey)
        this._hotkeyOff.next(hotkey)
        this.pressedHotkey = null
    }

    emitKeyEvent (nativeEvent: KeyboardEvent): void {
        this.zone.run(() => {
            this._key.next(nativeEvent)
        })
    }

    clearCurrentKeystrokes (): void {
        this.currentEvents = []
    }

    getCurrentKeySequence (): KeySequenceItem[] {
        this.currentEvents = this.currentEvents.filter(x => performance.now() - x.time < KEY_TIMEOUT && x.registrationTime >= this.lastMatchedHotkeyStartTime)
        return stringifyKeySequence(this.currentEvents)
    }

    getCurrentFullyMatchedHotkey (): string|null {
        return this.pressedHotkey
    }

    getCurrentPartiallyMatchedHotkeys (): PartialHotkeyMatch[] {
        const currentStrokes = this.getCurrentKeySequence().map(x => x.value)
        const config = this.getHotkeysConfig()
        const result: PartialHotkeyMatch[] = []
        for (const id in config) {
            for (const sequence of config[id]) {
                for (let matchLength = Math.min(currentStrokes.length, sequence.length); matchLength > 0; matchLength--) {
                    if (sequence.slice(0, matchLength).every(
                        (x: string, index: number) =>
                            x.toLowerCase() ===
                                currentStrokes[currentStrokes.length - matchLength + index].toLowerCase()
                    )) {
                        result.push({
                            matchedLength: matchLength,
                            id,
                            strokes: sequence,
                        })
                        break
                    }
                }
            }
        }
        return result
    }

    getHotkeyDescription (id: string): HotkeyDescription {
        return this.hotkeyDescriptions.filter((x) => x.id === id)[0]
    }

    enable (): void {
        this.disabledLevel--
    }

    disable (): void {
        this.disabledLevel++
    }

    isEnabled (): boolean {
        return this.disabledLevel === 0
    }

    async getHotkeyDescriptions (): Promise<HotkeyDescription[]> {
        return (
            await Promise.all(
                this.config.enabledServices(this.hotkeyProviders)
                    .map(async x => x.provide())
            )
        ).reduce((a, b) => a.concat(b))
    }

    private getHotkeysConfig () {
        return this.getHotkeysConfigRecursive(this.config.store.hotkeys)
    }

    private getHotkeysConfigRecursive (branch: any) {
        const keys = {}
        for (const key in branch) {
            let value = branch[key]
            if (value instanceof Object && !(value instanceof Array)) {
                const subkeys = this.getHotkeysConfigRecursive(value)
                for (const subkey in subkeys) {
                    keys[key + '.' + subkey] = subkeys[subkey]
                }
            } else {
                if (typeof value === 'string') {
                    value = [value]
                }
                if (!(value instanceof Array)) {
                    continue
                }
                if (value.length > 0) {
                    value = value.map((item: string | string[]) => typeof item === 'string' ? [item] : item)
                    keys[key] = value
                }
            }
        }
        return keys
    }
}
