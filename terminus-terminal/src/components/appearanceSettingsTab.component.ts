/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Observable } from 'rxjs'
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators'
import { exec } from 'mz/child_process'
const fontManager = require('fontmanager-redux') // eslint-disable-line

import { Component } from '@angular/core'
import { ConfigService, HostAppService, Platform, getCSSFontFamily } from 'terminus-core'

/** @hidden */
@Component({
    template: require('./appearanceSettingsTab.component.pug'),
    styles: [require('./appearanceSettingsTab.component.scss')],
})
export class AppearanceSettingsTabComponent {
    fonts: string[] = []

    constructor (
        private hostApp: HostAppService,
        public config: ConfigService,
    ) { }

    async ngOnInit () {
        if (this.hostApp.platform === Platform.Windows || this.hostApp.platform === Platform.macOS) {
            const fonts = await new Promise<any[]>((resolve) => fontManager.findFonts({ monospace: true }, resolve))
            if (this.hostApp.platform === Platform.Windows) {
                this.fonts = fonts.map(x => `${x.family} ${x.style}`.trim())
            } else {
                this.fonts = fonts.map(x => x.family.trim())
            }
            this.fonts.sort()
        }
        if (this.hostApp.platform === Platform.Linux) {
            exec('fc-list :spacing=mono').then(([stdout, _]) => {
                this.fonts = stdout.toString()
                    .split('\n')
                    .filter(x => !!x)
                    .map(x => x.split(':')[1].trim())
                    .map(x => x.split(',')[0].trim())
                this.fonts.sort()
            })
        }
    }

    fontAutocomplete = (text$: Observable<string>) => {
        return text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map(query => this.fonts.filter(v => new RegExp(query, 'gi').test(v))),
            map(list => Array.from(new Set(list))),
        )
    }

    getPreviewFontFamily () {
        return getCSSFontFamily(this.config.store)
    }
}
