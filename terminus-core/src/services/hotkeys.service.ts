import { Injectable, Inject, NgZone, EventEmitter } from '@angular/core'
import { IHotkeyDescription, HotkeyProvider } from '../api/hotkeyProvider'
import { NativeKeyEvent, stringifyKeySequence } from './hotkeys.util'
import { ConfigService } from '../services/config.service'
import { ElectronService } from '../services/electron.service'

export interface PartialHotkeyMatch {
    id: string
    strokes: string[]
    matchedLength: number
}

const KEY_TIMEOUT = 2000

interface EventBufferEntry {
    event: NativeKeyEvent
    time: number
}

@Injectable({ providedIn: 'root' })
export class HotkeysService {
    key = new EventEmitter<NativeKeyEvent>()
    matchedHotkey = new EventEmitter<string>()
    globalHotkey = new EventEmitter()
    private currentKeystrokes: EventBufferEntry[] = []
    private disabledLevel = 0
    private hotkeyDescriptions: IHotkeyDescription[] = []

    /** @hidden */
    constructor (
        private zone: NgZone,
        private electron: ElectronService,
        private config: ConfigService,
        @Inject(HotkeyProvider) private hotkeyProviders: HotkeyProvider[],
    ) {
        let events = ['keydown', 'keyup']
        events.forEach((event) => {
            document.addEventListener(event, (nativeEvent) => {
                if (document.querySelectorAll('input:focus').length === 0) {
                    this.pushKeystroke(event, nativeEvent)
                    this.processKeystrokes()
                    this.emitKeyEvent(nativeEvent)
                }
            })
        })
        this.config.changed$.subscribe(() => {
            this.registerGlobalHotkey()
        })
        this.registerGlobalHotkey()
        this.getHotkeyDescriptions().then(hotkeys => {
            this.hotkeyDescriptions = hotkeys
        })
    }

    /**
     * Adds a new key event to the buffer
     *
     * @param name DOM event name
     * @param nativeEvent event object
     */
    pushKeystroke (name, nativeEvent) {
        nativeEvent.event = name
        this.currentKeystrokes.push({ event: nativeEvent, time: performance.now() })
    }

    /**
     * Check the buffer for new complete keystrokes
     */
    processKeystrokes () {
        if (this.isEnabled()) {
            this.zone.run(() => {
                let matched = this.getCurrentFullyMatchedHotkey()
                if (matched) {
                    console.log('Matched hotkey', matched)
                    this.matchedHotkey.emit(matched)
                    this.clearCurrentKeystrokes()
                }
            })
        }
    }

    emitKeyEvent (nativeEvent) {
        this.zone.run(() => {
            this.key.emit(nativeEvent)
        })
    }

    clearCurrentKeystrokes () {
        this.currentKeystrokes = []
    }

    getCurrentKeystrokes (): string[] {
        this.currentKeystrokes = this.currentKeystrokes.filter(x => performance.now() - x.time < KEY_TIMEOUT)
        return stringifyKeySequence(this.currentKeystrokes.map(x => x.event))
    }

    private registerGlobalHotkey () {
        this.electron.globalShortcut.unregisterAll()
        let value = this.config.store.hotkeys['toggle-window'] || []
        if (typeof value === 'string') {
            value = [value]
        }
        value.forEach(item => {
            item = (typeof item === 'string') ? [item] : item

            try {
                this.electron.globalShortcut.register(item[0].replace(/-/g, '+'), () => {
                    this.globalHotkey.emit()
                })
            } catch (err) {
                console.error('Could not register the global hotkey:', err)
            }
        })
    }

    private getHotkeysConfig () {
        return this.getHotkeysConfigRecursive(this.config.store.hotkeys)
    }

    private getHotkeysConfigRecursive (branch) {
        let keys = {}
        for (let key in branch) {
            let value = branch[key]
            if (value instanceof Object && !(value instanceof Array)) {
                let subkeys = this.getHotkeysConfigRecursive(value)
                for (let subkey in subkeys) {
                    keys[key + '.' + subkey] = subkeys[subkey]
                }
            } else {
                if (typeof value === 'string') {
                    value = [value]
                }
                if (value) {
                    value = value.map((item) => (typeof item === 'string') ? [item] : item)
                    keys[key] = value
                }
            }
        }
        return keys
    }

    private getCurrentFullyMatchedHotkey (): string {
        let currentStrokes = this.getCurrentKeystrokes()
        let config = this.getHotkeysConfig()
        for (let id in config) {
            for (let sequence of config[id]) {
                if (currentStrokes.length < sequence.length) {
                    continue
                }
                if (sequence.every(
                    (x, index) =>
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
        let currentStrokes = this.getCurrentKeystrokes()
        let config = this.getHotkeysConfig()
        let result = []
        for (let id in config) {
            for (let sequence of config[id]) {
                for (let matchLength = Math.min(currentStrokes.length, sequence.length); matchLength > 0; matchLength--) {
                    if (sequence.slice(0, matchLength).every(
                        (x, index) =>
                            x.toLowerCase() ===
                                currentStrokes[currentStrokes.length - matchLength + index].toLowerCase()
                    )) {
                        result.push({
                            matchedLength: matchLength,
                            id,
                            strokes: sequence
                        })
                        break
                    }
                }
            }
        }
        return result
    }

    getHotkeyDescription (id: string): IHotkeyDescription {
        return this.hotkeyDescriptions.filter((x) => x.id === id)[0]
    }

    enable () {
        this.disabledLevel--
    }

    disable () {
        this.disabledLevel++
    }

    isEnabled () {
        return this.disabledLevel === 0
    }

    async getHotkeyDescriptions (): Promise<IHotkeyDescription[]> {
        return (
            await Promise.all(
                this.config.enabledServices(this.hotkeyProviders)
                    .map(async x => x.provide ? x.provide() : x.hotkeys)
            )
        ).reduce((a, b) => a.concat(b))
    }
}
