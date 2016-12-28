import { Injectable, NgZone, EventEmitter } from '@angular/core'
import { ElectronService } from 'services/electron'
import { NativeKeyEvent, stringifyKeySequence } from './hotkeys.util'
const hterm = require('hterm-commonjs')

const KEY_TIMEOUT = 2000

interface EventBufferEntry {
    event: NativeKeyEvent,
    time: number,
}

@Injectable()
export class HotkeysService {
    key = new EventEmitter<NativeKeyEvent>()
    globalHotkey = new EventEmitter()
    private currentKeystrokes: EventBufferEntry[] = []

    constructor(
        private zone: NgZone,
        private electron: ElectronService,
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
    }

    emitNativeEvent (name, nativeEvent) {
        nativeEvent.event = name

        console.log(nativeEvent)
        this.currentKeystrokes.push({ event: nativeEvent, time: performance.now() })

        this.zone.run(() => {
            this.key.emit(nativeEvent)
        })
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
}
