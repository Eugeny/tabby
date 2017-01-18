import { Injectable, NgZone, EventEmitter } from '@angular/core'
import { ElectronService } from 'services/electron'
import { ConfigService } from 'services/config'
import { NativeKeyEvent, stringifyKeySequence } from './hotkeys.util'
const hterm = require('hterm-commonjs')

export interface HotkeyDescription {
    id: string,
    name: string,
    defaults: string[][],
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
        defaults: [['Ctrl+Shift+T'], ['Ctrl+A', 'C']],
    },
    {
        id: 'close-tab',
        name: 'Close tab',
        defaults: [['Ctrl+Shift+W'], ['Ctrl+A', 'K']],
    },
    {
        id: 'toggle-last-tab',
        name: 'Toggle last tab',
        defaults: [['Ctrl+A', 'A'], ['Ctrl+A', 'Ctrl+A']],
    },
    {
        id: 'next-tab',
        name: 'Next tab',
        defaults: [['Ctrl+Shift-ArrowRight'], ['Ctrl+A', 'N']],
    },
    {
        id: 'previous-tab',
        name: 'Previous tab',
        defaults: [['Ctrl+Shift-ArrowLeft'], ['Ctrl+A', 'P']],
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
                this.emitNativeEvent(event.name, nativeEvent)
            })

            let oldHandler = hterm.hterm.Keyboard.prototype[event.htermHandler]
            const __this = this
            hterm.hterm.Keyboard.prototype[event.htermHandler] = function (nativeEvent) {
                __this.emitNativeEvent(event.name, nativeEvent)
                oldHandler.bind(this)(nativeEvent)
            }
        })

        if (!config.get('hotkeys')) {
            config.set('hotkeys', {})
        }
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
        this.electron.globalShortcut.register('`', () => {
            this.globalHotkey.emit()
        })
    }

    getHotkeysConfig () {
        let keys = {}
        for (let key of HOTKEYS) {
            keys[key.id] = key.defaults
        }
        for (let key in this.config.get('hotkeys')) {
            keys[key] = this.config.get('hotkeys')[key]
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
