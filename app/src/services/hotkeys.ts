import { Injectable, NgZone, EventEmitter } from '@angular/core'
import { ElectronService } from 'services/electron'
import { ConfigService } from 'services/config'
import { NativeKeyEvent, stringifyKeySequence } from './hotkeys.util'
const hterm = require('hterm-commonjs')

export interface HotkeyDescription {
    id: string,
    name: string,
}

export interface PartialHotkeyMatch {
    id: string,
    strokes: string[],
    matchedLength: number,
}

const KEY_TIMEOUT = 2000
const HOTKEYS: HotkeyDescription[] = [
    {
        id: 'new-tab',
        name: 'New tab',
    },
    {
        id: 'close-tab',
        name: 'Close tab',
    },
    {
        id: 'toggle-last-tab',
        name: 'Toggle last tab',
    },
    {
        id: 'next-tab',
        name: 'Next tab',
    },
    {
        id: 'previous-tab',
        name: 'Previous tab',
    },
    {
        id: 'tab-1',
        name: 'Tab 1',
    },
    {
        id: 'tab-2',
        name: 'Tab 2',
    },
    {
        id: 'tab-3',
        name: 'Tab 3',
    },
    {
        id: 'tab-4',
        name: 'Tab 4',
    },
    {
        id: 'tab-5',
        name: 'Tab 5',
    },
    {
        id: 'tab-6',
        name: 'Tab 6',
    },
    {
        id: 'tab-7',
        name: 'Tab 7',
    },
    {
        id: 'tab-8',
        name: 'Tab 8',
    },
    {
        id: 'tab-9',
        name: 'Tab 9',
    },
    {
        id: 'tab-10',
        name: 'Tab 10',
    },
]


interface EventBufferEntry {
    event: NativeKeyEvent,
    time: number,
}

@Injectable()
export class HotkeysService {
    key = new EventEmitter<NativeKeyEvent>()
    matchedHotkey = new EventEmitter<string>()
    globalHotkey = new EventEmitter()
    private currentKeystrokes: EventBufferEntry[] = []
    private disabledLevel = 0

    constructor(
        private zone: NgZone,
        private electron: ElectronService,
        private config: ConfigService,
    ) {
        let events = [
            {
                name: 'keydown',
                htermHandler: 'onKeyDown_',
            },
            {
                name: 'keyup',
                htermHandler: 'onKeyUp_',
            },
        ]
        events.forEach((event) => {
            document.addEventListener(event.name, (nativeEvent) => {
                if (document.querySelectorAll(':focus').length == 0) {
                    this.emitNativeEvent(event.name, nativeEvent)
                }
            })

            let oldHandler = hterm.hterm.Keyboard.prototype[event.htermHandler]
            const __this = this
            hterm.hterm.Keyboard.prototype[event.htermHandler] = function (nativeEvent) {
                __this.emitNativeEvent(event.name, nativeEvent)
                oldHandler.bind(this)(nativeEvent)
            }
        })
    }

    emitNativeEvent (name, nativeEvent) {
        nativeEvent.event = name

        //console.log(nativeEvent)
        this.currentKeystrokes.push({ event: nativeEvent, time: performance.now() })

        this.zone.run(() => {
            if (this.isEnabled()) {
                let matched = this.getCurrentFullyMatchedHotkey()
                if (matched) {
                    console.log('Matched hotkey', matched)
                    this.matchedHotkey.emit(matched)
                    this.clearCurrentKeystrokes()
                }
            }
            this.key.emit(nativeEvent)
        })
    }

    clearCurrentKeystrokes () {
        this.currentKeystrokes = []
    }

    getCurrentKeystrokes () : string[] {
        this.currentKeystrokes = this.currentKeystrokes.filter((x) => performance.now() - x.time < KEY_TIMEOUT )
        return stringifyKeySequence(this.currentKeystrokes.map((x) => x.event))
    }

    registerHotkeys () {
        this.electron.globalShortcut.unregisterAll()
        // TODO
        this.electron.globalShortcut.register('PrintScreen', () => {
            this.globalHotkey.emit()
        })
    }

    getHotkeysConfig () {
        let keys = {}
        for (let key in this.config.full().hotkeys) {
            let value = this.config.full().hotkeys[key]
            if (typeof value == 'string') {
                value = [value]
            }
            value = value.map((item) => (typeof item == 'string') ? [item] : item)
            keys[key] = value
        }
        return keys
    }

    getCurrentFullyMatchedHotkey () : string {
        for (let id in this.getHotkeysConfig()) {
            for (let sequence of this.getHotkeysConfig()[id]) {
                let currentStrokes = this.getCurrentKeystrokes()
                if (currentStrokes.length < sequence.length) {
                    break
                }
                if (sequence.every((x, index) => {
                    return x.toLowerCase() == currentStrokes[currentStrokes.length - sequence.length + index].toLowerCase()
                })) {
                    return id
                }
            }
        }
        return null
    }

    getCurrentPartiallyMatchedHotkeys () : PartialHotkeyMatch[] {
        let result = []
        for (let id in this.getHotkeysConfig()) {
            for (let sequence of this.getHotkeysConfig()[id]) {
                let currentStrokes = this.getCurrentKeystrokes()

                for (let matchLength = Math.min(currentStrokes.length, sequence.length); matchLength > 0; matchLength--) {
                    //console.log(sequence, currentStrokes.slice(currentStrokes.length - sequence.length))
                    if (sequence.slice(0, matchLength).every((x, index) => {
                        return x.toLowerCase() == currentStrokes[currentStrokes.length - matchLength + index].toLowerCase()
                    })) {
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

    getHotkeyDescription (id: string) : HotkeyDescription {
        return HOTKEYS.filter((x) => x.id == id)[0]
    }

    enable () {
        this.disabledLevel--
    }

    disable () {
        this.disabledLevel++
    }

    isEnabled () {
        return this.disabledLevel == 0
    }

}
