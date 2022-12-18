/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'
import { Component, NgZone } from '@angular/core'
import {
    ConfigService,
    HotkeyDescription,
    HotkeysService,
    HostAppService,
} from 'tabby-core'
import { Hotkey } from 'tabby-core/src/api/hotkeyProvider'

_('Search hotkeys')

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

    getHotkeys (id: string): Hotkey[] {
        let ptr = this.config.store.hotkeys
        for (const token of id.split(/\./g)) {
            ptr = ptr[token]
        }
        return (ptr || []).map(hotkey => this.detectDuplicates(hotkey))
    }

    setHotkeys (id: string, hotkeys: Hotkey[]) {
        let ptr = this.config.store
        let prop = 'hotkeys'
        for (const token of id.split(/\./g)) {
            ptr = ptr[prop]
            prop = token
        }
        ptr[prop] = hotkeys.map(hotkey =>
            hotkey.strokes.length === 1 && Array.isArray(hotkey.strokes)
                ? hotkey.strokes[0]
                : hotkey.strokes,
        )
        this.config.save()
    }

    hotkeyFilterFn (hotkey: HotkeyDescription, query: string): boolean {
        const s = hotkey.name + hotkey.id + this.getHotkeys(hotkey.id).map(h => h.strokes).toString()
        return s.toLowerCase().includes(query.toLowerCase())
    }

    private detectDuplicates (strokes: string[] | string): Hotkey {
        const allHotkeys = Object
            .values(this.config.store.hotkeys)
            .filter((value: unknown) => Array.isArray(value))
            .flat()

        const isDuplicate = allHotkeys
            .filter(hotkey => JSON.stringify(hotkey) === JSON.stringify(strokes))
            .length > 1

        return { strokes, isDuplicate }
    }
}
