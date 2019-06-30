import { Injectable, Inject, NgZone, EventEmitter } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from '../api/hotkeyProvider'
import { stringifyKeySequence } from './hotkeys.util'
import { ConfigService } from '../services/config.service'
import { ElectronService } from '../services/electron.service'

export interface PartialHotkeyMatch {
    id: string
    strokes: string[]
    matchedLength: number
}

const KEY_TIMEOUT = 2000

interface EventBufferEntry {
    event: KeyboardEvent
    time: number
}

@Injectable({ providedIn: 'root' })
export class HotkeysService {
    key = new EventEmitter<KeyboardEvent>()
    matchedHotkey = new EventEmitter<string>()
    globalHotkey = new EventEmitter<void>()
    private currentKeystrokes: EventBufferEntry[] = []
    private disabledLevel = 0
    private hotkeyDescriptions: HotkeyDescription[] = []

    private constructor (
        private zone: NgZone,
        private electron: ElectronService,
        private config: ConfigService,
        @Inject(HotkeyProvider) private hotkeyProviders: HotkeyProvider[],
    ) {
        const events = ['keydown', 'keyup']
        events.forEach(event => {
            document.addEventListener(event, (nativeEvent: KeyboardEvent) => {
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
    pushKeystroke (name: string, nativeEvent: KeyboardEvent) {
        (nativeEvent as any).event = name
        this.currentKeystrokes.push({ event: nativeEvent, time: performance.now() })
    }

    /**
     * Check the buffer for new complete keystrokes
     */
    processKeystrokes () {
        if (this.isEnabled()) {
            this.zone.run(() => {
                const matched = this.getCurrentFullyMatchedHotkey()
                if (matched) {
                    console.log('Matched hotkey', matched)
                    this.matchedHotkey.emit(matched)
                    this.clearCurrentKeystrokes()
                }
            })
        }
    }

    emitKeyEvent (nativeEvent: KeyboardEvent) {
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

    getCurrentFullyMatchedHotkey (): string {
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
        const result = []
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

    enable () {
        this.disabledLevel--
    }

    disable () {
        this.disabledLevel++
    }

    isEnabled () {
        return this.disabledLevel === 0
    }

    async getHotkeyDescriptions (): Promise<HotkeyDescription[]> {
        return (
            await Promise.all(
                this.config.enabledServices(this.hotkeyProviders)
                    .map(async x => x.provide ? x.provide() : x.hotkeys)
            )
        ).reduce((a, b) => a.concat(b))
    }

    private registerGlobalHotkey () {
        this.electron.globalShortcut.unregisterAll()
        let value = this.config.store.hotkeys['toggle-window'] || []
        if (typeof value === 'string') {
            value = [value]
        }
        value.forEach((item: string | string[]) => {
            item = typeof item === 'string' ? [item] : item

            try {
                let electronKeySpec = item[0]
                electronKeySpec = electronKeySpec.replace('⌘', 'Command')
                electronKeySpec = electronKeySpec.replace('⌥', 'Alt')
                electronKeySpec = electronKeySpec.replace(/-/g, '+')
                this.electron.globalShortcut.register(electronKeySpec, () => {
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
                if (value) {
                    value = value.map((item: string | string[]) => typeof item === 'string' ? [item] : item)
                    keys[key] = value
                }
            }
        }
        return keys
    }
}
