import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/debounceTime'
import 'rxjs/add/operator/distinctUntilChanged'
const equal = require('deep-equal')
const fontManager = require('font-manager')

import { Component, Inject } from '@angular/core'
import { ConfigService, HostAppService, Platform } from 'terminus-core'
const { exec } = require('child-process-promise')

import { TerminalColorSchemeProvider, ITerminalColorScheme } from '../api'


@Component({
    template: require('./settings.pug'),
    styles: [require('./settings.scss')],
})
export class SettingsComponent {
    fonts: string[] = []
    colorSchemes: ITerminalColorScheme[] = []
    equalComparator = equal

    constructor(
        public config: ConfigService,
        private hostApp: HostAppService,
        @Inject(TerminalColorSchemeProvider) private colorSchemeProviders: TerminalColorSchemeProvider[],
    ) { }

    async ngOnInit () {
        if (this.hostApp.platform == Platform.Windows) {
            let fonts = await new Promise<any[]>((resolve) => fontManager.findFonts({ monospace: true }, resolve))
            this.fonts = fonts.map(x => x.family)
            this.fonts.sort()
        }
        if (this.hostApp.platform == Platform.Linux) {
            exec('fc-list :spacing=mono').then((result) => {
                this.fonts = result.stdout
                    .split('\n')
                    .filter(x => !!x)
                    .map(x => x.split(':')[1].trim())
                    .map(x => x.split(',')[0].trim())
                this.fonts.sort()
            })
        }
        this.colorSchemes = (await Promise.all(this.colorSchemeProviders.map(x => x.getSchemes()))).reduce((a, b) => a.concat(b))
    }

    fontAutocomplete = (text$: Observable<string>) => {
        return text$
          .debounceTime(200)
          .distinctUntilChanged()
          .map(query => this.fonts.filter(v => new RegExp(query, 'gi').test(v)))
          .map(list => Array.from(new Set(list)))
    }


}
