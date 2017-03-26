import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/debounceTime'
import 'rxjs/add/operator/distinctUntilChanged'
import { Component } from '@angular/core'
const childProcessPromise = nodeRequire('child-process-promise')

import { ConfigService } from 'services/config'


@Component({
    template: require('./settings.pug'),
    styles: [require('./settings.scss')],
})
export class SettingsComponent {
    fonts: string[] = []

    constructor(
        public config: ConfigService,
    ) { }

    ngOnInit () {
        childProcessPromise.exec('fc-list :spacing=mono').then((result) => {
            this.fonts = result.stdout
                .split('\n')
                .filter((x) => !!x)
                .map((x) => x.split(':')[1].trim())
                .map((x) => x.split(',')[0].trim())
            this.fonts.sort()
        })
    }

    fontAutocomplete = (text$: Observable<string>) => {
        return text$
          .debounceTime(200)
          .distinctUntilChanged()
          .map(query => this.fonts.filter(v => new RegExp(query, 'gi').test(v)))
          .map(list => Array.from(new Set(list)))
    }


}
