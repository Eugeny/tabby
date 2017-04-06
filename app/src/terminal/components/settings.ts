import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/debounceTime'
import 'rxjs/add/operator/distinctUntilChanged'
const childProcessPromise = require('child-process-promise')
const equal = require('deep-equal')

import { Component, Inject } from '@angular/core'
import { TerminalColorSchemeProvider, ITerminalColorScheme } from '../api'
import { ConfigService } from 'services/config'


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
        @Inject(TerminalColorSchemeProvider) private colorSchemeProviders: TerminalColorSchemeProvider[],
    ) { }

    async ngOnInit () {
        childProcessPromise.exec('fc-list :spacing=mono').then((result) => {
            this.fonts = result.stdout
                .split('\n')
                .filter((x) => !!x)
                .map((x) => x.split(':')[1].trim())
                .map((x) => x.split(',')[0].trim())
            this.fonts.sort()
        })

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
