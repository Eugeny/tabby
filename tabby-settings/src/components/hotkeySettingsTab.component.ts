/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, NgZone } from '@angular/core'
import {
    ConfigService,
    HotkeyDescription,
    HotkeysService,
    HostAppService,
} from 'tabby-core'

/** @hidden */
@Component({
    selector: 'hotkey-settings-tab',
    template: require('./hotkeySettingsTab.component.pug'),
})
export class HotkeySettingsTabComponent {
    hotkeyFilter = ''
    hotkeyDescriptions: HotkeyDescription[]

    constructor (
        public config: ConfigService,
        public hostApp: HostAppService,
        public zone: NgZone,
        hotkeys: HotkeysService,
    ) {
        hotkeys.getHotkeyDescriptions().then(descriptions => {
            this.hotkeyDescriptions = descriptions
        })
    }

    getHotkey (id: string) {
        let ptr = this.config.store.hotkeys
        for (const token of id.split(/\./g)) {
            ptr = ptr[token]
        }
        return ptr
    }

    setHotkey (id: string, value) {
        let ptr = this.config.store
        let prop = 'hotkeys'
        for (const token of id.split(/\./g)) {
            ptr = ptr[prop]
            prop = token
        }
        ptr[prop] = value
        this.config.save()
    }

    hotkeyFilterFn (hotkey: HotkeyDescription, query: string): boolean {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        const s = hotkey.name + hotkey.id + (this.getHotkey(hotkey.id) || []).toString()
        return s.toLowerCase().includes(query.toLowerCase())
    }
}
