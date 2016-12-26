import { Injectable, NgZone, EventEmitter } from '@angular/core'
const hterm = require('hterm-commonjs')


export interface Key {
    event: string,
    alt: boolean,
    ctrl: boolean,
    cmd: boolean,
    shift: boolean,
    key: string
}

@Injectable()
export class HotkeysService {
    key = new EventEmitter<Key>()

    constructor(private zone: NgZone) {
        let events = [
            {
                name: 'keydown',
                htermHandler: 'onKeyDown_',
            },
            {
                name: 'keypress',
                htermHandler: 'onKeyPress_',
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
        console.debug('Key', nativeEvent)
        this.zone.run(() => {
            this.key.emit({
                event: name,
                alt: nativeEvent.altKey,
                shift: nativeEvent.shiftKey,
                cmd: nativeEvent.metaKey,
                ctrl: nativeEvent.ctrlKey,
                key: nativeEvent.key,
            })
        })
    }
}
