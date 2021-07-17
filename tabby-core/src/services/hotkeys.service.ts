import { Injectable, Inject, NgZone, EventEmitter } from '@angular/core'
import { Observable, Subject } from 'rxjs'
import { HotkeyDescription, HotkeyProvider } from '../api/hotkeyProvider'
import { stringifyKeySequence, EventData } from './hotkeys.util'
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

    private _hotkey = new Subject<string>()
    private currentKeystrokes: EventData[] = []
    private disabledLevel = 0
    private hotkeyDescriptions: HotkeyDescription[] = []

    private constructor (
        private zone: NgZone,
        private config: ConfigService,
        @Inject(HotkeyProvider) private hotkeyProviders: HotkeyProvider[],
        hostApp: HostAppService,
    ) {
        const events = ['keydown', 'keyup']
        events.forEach(event => {
            document.addEventListener(event, (nativeEvent: KeyboardEvent) => {
                if (document.querySelectorAll('input:focus').length === 0) {
                    this.pushKeystroke(event, nativeEvent)
                    this.processKeystrokes()
                    this.emitKeyEvent(nativeEvent)
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
    }

    /**
     * Adds a new key event to the buffer
     *
     * @param name DOM event name
     * @param nativeEvent event object
     */
    pushKeystroke (name: string, nativeEvent: KeyboardEvent): void {
        nativeEvent['event'] = name
        this.currentKeystrokes.push({
            ctrlKey: nativeEvent.ctrlKey,
            metaKey: nativeEvent.metaKey,
            altKey: nativeEvent.altKey,
            shiftKey: nativeEvent.shiftKey,
            code: nativeEvent.code,
            key: nativeEvent.key,
            eventName: name,
            time: performance.now(),
        })
    }

    /**
     * Check the buffer for new complete keystrokes
     */
    processKeystrokes (): void {
        if (this.isEnabled()) {
            this.zone.run(() => {
                const matched = this.getCurrentFullyMatchedHotkey()
                if (matched) {
                    console.log('Matched hotkey', matched)
                    this._hotkey.next(matched)
                    this.clearCurrentKeystrokes()
                }
            })
        }
    }

    emitKeyEvent (nativeEvent: KeyboardEvent): void {
        this.zone.run(() => {
            this.key.emit(nativeEvent)
        })
    }

    clearCurrentKeystrokes (): void {
        this.currentKeystrokes = []
    }

    getCurrentKeystrokes (): string[] {
        this.currentKeystrokes = this.currentKeystrokes.filter(x => performance.now() - x.time < KEY_TIMEOUT)
        return stringifyKeySequence(this.currentKeystrokes)
    }

    getCurrentFullyMatchedHotkey (): string|null {
        const currentStrokes = this.getCurrentKeystrokes()
        const config = this.getHotkeysConfig()
        for (const id in config) {
            for (const sequence of config[id]) {
                if (currentStrokes.length < sequence.length) {
                    continue
                }
                if (sequence.every(
                    (x: string, index: number) =>
                        x.toLowerCase() ===
                            currentStrokes[currentStrokes.length - sequence.length + index].toLowerCase()
                )) {
                    return id
                }
            }
        }
        return null
    }

    getCurrentPartiallyMatchedHotkeys (): PartialHotkeyMatch[] {
        const currentStrokes = this.getCurrentKeystrokes()
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
