import { Injectable, Inject, NgZone, EventEmitter } from '@angular/core'
import { Observable, Subject } from 'rxjs'
import { HotkeyDescription, HotkeyProvider } from '../api/hotkeyProvider'
import { KeyEventData, getKeyName, Keystroke, KeyName, getKeystrokeName, metaKeyName, altKeyName } from './hotkeys.util'
import { ConfigService } from './config.service'
import { HostAppService, Platform } from '../api/hostApp'
import { deprecate } from 'util'

export interface PartialHotkeyMatch {
    id: string
    strokes: string[]
    matchedLength: number
}

interface PastKeystroke {
    keystroke: Keystroke
    time: number
}

@Injectable({ providedIn: 'root' })
export class HotkeysService {
    /** @hidden @deprecated */
    key = new EventEmitter<KeyboardEvent>()

    /** @hidden @deprecated */
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
     * Fired for each singular key
     */
    get key$ (): Observable<KeyName> { return this._key }

    /**
     * Fired for each key event
     */
    get keyEvent$ (): Observable<KeyboardEvent> { return this._keyEvent }

    /**
     * Fired for each singular key combination
     */
    get keystroke$ (): Observable<Keystroke> { return this._keystroke }

    private _hotkey = new Subject<string>()
    private _hotkeyOff = new Subject<string>()
    private _keyEvent = new Subject<KeyboardEvent>()
    private _key = new Subject<KeyName>()
    private _keystroke = new Subject<Keystroke>()
    private disabledLevel = 0
    private hotkeyDescriptions: HotkeyDescription[] = []

    private pressedKeys = new Set<KeyName>()
    private pressedKeyTimestamps = new Map<KeyName, number>()
    private pressedHotkey: string|null = null
    private pressedKeystroke: Keystroke|null = null
    private lastKeystrokes: PastKeystroke[] = []
    private recognitionPhase = true
    private lastEventTimestamp = 0

    private constructor (
        private zone: NgZone,
        private config: ConfigService,
        @Inject(HotkeyProvider) private hotkeyProviders: HotkeyProvider[],
        hostApp: HostAppService,
    ) {
        this.config.ready$.toPromise().then(async () => {
            const hotkeys = await this.getHotkeyDescriptions()
            this.hotkeyDescriptions = hotkeys
            const events = ['keydown', 'keyup']

            events.forEach(eventType => {
                document.addEventListener(eventType, (nativeEvent: KeyboardEvent) => {
                    this._keyEvent.next(nativeEvent)
                    this.pushKeyEvent(eventType, nativeEvent)
                    if (hostApp.platform === Platform.Web && this.matchActiveHotkey(true) !== null) {
                        nativeEvent.preventDefault()
                        nativeEvent.stopPropagation()
                    }
                })
            })
        })

        // deprecated
        this.hotkey$.subscribe(h => this.matchedHotkey.emit(h))
        this.matchedHotkey.subscribe = deprecate(s => this.hotkey$.subscribe(s), 'matchedHotkey is deprecated, use hotkey$')
        this.keyEvent$.subscribe(h => this.key.next(h))
        this.key.subscribe = deprecate(s => this.keyEvent$.subscribe(s), 'key is deprecated, use keyEvent$')
    }

    /**
     * Adds a new key event to the buffer
     *
     * @param eventName DOM event name
     * @param nativeEvent event object
     */
    pushKeyEvent (eventName: string, nativeEvent: KeyboardEvent): void {
        if (nativeEvent.timeStamp === this.lastEventTimestamp) {
            return
        }

        nativeEvent['event'] = eventName

        const eventData = {
            ctrlKey: nativeEvent.ctrlKey,
            metaKey: nativeEvent.metaKey,
            altKey: nativeEvent.altKey,
            shiftKey: nativeEvent.shiftKey,
            code: nativeEvent.code,
            key: nativeEvent.key,
            eventName,
            time: nativeEvent.timeStamp,
            registrationTime: performance.now(),
        }

        for (const [key, time] of this.pressedKeyTimestamps.entries()) {
            if (time < performance.now() - 2000) {
                this.removePressedKey(key)
            }
        }

        const keyName = getKeyName(eventData)
        if (eventName === 'keydown') {
            this.addPressedKey(keyName, eventData)
            if (!nativeEvent.repeat) {
                this.recognitionPhase = true
            }
            this.updateModifiers(eventData)
        }
        if (eventName === 'keyup') {
            const keystroke = getKeystrokeName([...this.pressedKeys])
            if (this.recognitionPhase) {
                this._keystroke.next(keystroke)
                this.lastKeystrokes.push({
                    keystroke,
                    time: performance.now(),
                })
                this.recognitionPhase = false
            }
            this.pressedKeys.clear()
            this.pressedKeyTimestamps.clear()
            this.removePressedKey(keyName)
        }

        if (this.pressedKeys.size) {
            this.pressedKeystroke = getKeystrokeName([...this.pressedKeys])
        } else {
            this.pressedKeystroke = null
        }

        const matched = this.matchActiveHotkey()
        this.zone.run(() => {
            if (matched && this.recognitionPhase) {
                this.emitHotkeyOn(matched)
            } else if (this.pressedHotkey) {
                this.emitHotkeyOff(this.pressedHotkey)
            }
        })

        this.zone.run(() => {
            this._key.next(getKeyName(eventData))
        })

        if (process.platform === 'darwin' && eventData.metaKey && eventName === 'keydown' && !['Ctrl', 'Shift', altKeyName, metaKeyName].includes(keyName)) {
            // macOS will swallow non-modified keyups if Cmd is held down
            this.pushKeyEvent('keyup', nativeEvent)
        }

        this.lastEventTimestamp = nativeEvent.timeStamp
    }

    getCurrentKeystrokes (): Keystroke[] {
        if (!this.pressedKeystroke) {
            return []
        }
        return [...this.lastKeystrokes.map(x => x.keystroke), this.pressedKeystroke]
    }

    matchActiveHotkey (partial = false): string|null {
        if (!this.isEnabled() || !this.pressedKeystroke) {
            return null
        }
        const matches: {
            id: string,
            sequence: string[],
        }[] = []

        const currentSequence = this.getCurrentKeystrokes()

        const config = this.getHotkeysConfig()
        for (const id in config) {
            for (const sequence of config[id]) {
                if (currentSequence.length < sequence.length) {
                    continue
                }
                if (sequence[sequence.length - 1] !== this.pressedKeystroke) {
                    continue
                }

                let lastIndex = 0
                let matched = true
                for (const item of sequence) {
                    const nextOffset = currentSequence.slice(lastIndex).findIndex(
                        x => x.toLowerCase() === item.toLowerCase()
                    )
                    if (nextOffset === -1) {
                        matched = false
                        break
                    }
                    lastIndex += nextOffset
                }

                if (partial ? lastIndex > 0 : matched) {
                    matches.push({
                        id,
                        sequence,
                    })
                }
            }
        }

        matches.sort((a, b) => b.sequence.length - a.sequence.length)
        if (!matches.length) {
            return null
        }
        if (matches[0].sequence.length > 1) {
            this.clearCurrentKeystrokes()
        }
        return matches[0].id
    }

    clearCurrentKeystrokes (): void {
        this.lastKeystrokes = []
        this.pressedKeys.clear()
        this.pressedKeyTimestamps.clear()
        this.pressedKeystroke = null
        this.pressedHotkey = null
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

    private updateModifiers (event: KeyEventData) {
        for (const [prop, key] of Object.entries({
            ctrlKey: 'Ctrl',
            metaKey: metaKeyName,
            altKey: altKeyName,
            shiftKey: 'Shift',
        })) {
            if (!event[prop] && this.pressedKeys.has(key)) {
                this.removePressedKey(key)
            }
            if (event[prop] && !this.pressedKeys.has(key)) {
                this.addPressedKey(key, event)
            }
        }
    }

    private emitHotkeyOn (hotkey: string) {
        if (this.pressedHotkey) {
            if (this.pressedHotkey === hotkey) {
                return
            }
            this.emitHotkeyOff(this.pressedHotkey)
        }
        if (document.querySelectorAll('input:focus').length === 0) {
            console.debug('Matched hotkey', hotkey)
            this._hotkey.next(hotkey)
            this.pressedHotkey = hotkey
        }
        this.recognitionPhase = false
    }

    private emitHotkeyOff (hotkey: string) {
        console.debug('Unmatched hotkey', hotkey)
        this._hotkeyOff.next(hotkey)
        this.pressedHotkey = null
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

    private addPressedKey (keyName: KeyName, eventData: KeyEventData) {
        this.pressedKeys.add(keyName)
        this.pressedKeyTimestamps.set(keyName, eventData.registrationTime)
    }

    private removePressedKey (key: KeyName) {
        this.pressedKeys.delete(key)
        this.pressedKeyTimestamps.delete(key)
    }
}
