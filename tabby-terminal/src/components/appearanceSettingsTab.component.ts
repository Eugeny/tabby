/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Observable, debounceTime, distinctUntilChanged, map } from 'rxjs'
import { debounce } from 'utils-decorators/dist/esm/debounce/debounce'

import { Component } from '@angular/core'
import { ConfigService, getCSSFontFamily, PlatformService, ThemesService } from 'tabby-core'

/** @hidden */
@Component({
    templateUrl: './appearanceSettingsTab.component.pug',
    styleUrls: ['./appearanceSettingsTab.component.scss'],
})
export class AppearanceSettingsTabComponent {
    fonts: string[] = []

    constructor (
        public config: ConfigService,
        public themes: ThemesService,
        private platform: PlatformService,
    ) { }

    async ngOnInit () {
        this.fonts = await this.platform.listFonts()
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

    @debounce(500)
    saveConfiguration (requireRestart?: boolean) {
        this.config.save()
        if (requireRestart) {
            this.config.requestRestart()
        }
    }

    fixFontSize () {
        this.config.store.terminal.fontSize = Math.min(
            50,
            Math.max(
                5,
                this.config.store.terminal.fontSize,
            ),
        )
    }
}
