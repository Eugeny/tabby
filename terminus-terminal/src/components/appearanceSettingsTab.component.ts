import { Observable } from 'rxjs'
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators'
import { exec } from 'mz/child_process'
import deepEqual = require('deep-equal')
const fontManager = require('font-manager')

import { Component, Inject } from '@angular/core'
import { ConfigService, HostAppService, Platform } from 'terminus-core'
import { TerminalColorSchemeProvider, ITerminalColorScheme } from '../api'

@Component({
    template: require('./appearanceSettingsTab.component.pug'),
    styles: [require('./appearanceSettingsTab.component.scss')],
})
export class AppearanceSettingsTabComponent {
    fonts: string[] = []
    colorSchemes: ITerminalColorScheme[] = []
    equalComparator = deepEqual
    editingColorScheme: ITerminalColorScheme
    schemeChanged = false

    constructor (
        @Inject(TerminalColorSchemeProvider) private colorSchemeProviders: TerminalColorSchemeProvider[],
        private hostApp: HostAppService,
        public config: ConfigService,
    ) { }

    async ngOnInit () {
        if (this.hostApp.platform === Platform.Windows || this.hostApp.platform === Platform.macOS) {
            let fonts = await new Promise<any[]>((resolve) => fontManager.findFonts({ monospace: true }, resolve))
            this.fonts = fonts.map(x => x.family)
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
        this.colorSchemes = (await Promise.all(this.config.enabledServices(this.colorSchemeProviders).map(x => x.getSchemes()))).reduce((a, b) => a.concat(b))
    }

    fontAutocomplete = (text$: Observable<string>) => {
        return text$.pipe(
          debounceTime(200),
          distinctUntilChanged(),
          map(query => this.fonts.filter(v => new RegExp(query, 'gi').test(v))),
          map(list => Array.from(new Set(list))),
      )
    }

    editScheme (scheme: ITerminalColorScheme) {
        this.editingColorScheme = scheme
        this.schemeChanged = false
    }

    saveScheme () {
        let schemes = this.config.store.terminal.customColorSchemes
        schemes = schemes.filter(x => x !== this.editingColorScheme && x.name !== this.editingColorScheme.name)
        schemes.push(this.editingColorScheme)
        this.config.store.terminal.customColorSchemes = schemes
        this.config.save()
        this.cancelEditing()
    }

    cancelEditing () {
        this.editingColorScheme = null
    }

    deleteScheme (scheme: ITerminalColorScheme) {
        if (confirm(`Delete "${scheme.name}"?`)) {
            let schemes = this.config.store.terminal.customColorSchemes
            schemes = schemes.filter(x => x !== scheme)
            this.config.store.terminal.customColorSchemes = schemes
            this.config.save()
        }
    }

    isCustomScheme (scheme: ITerminalColorScheme) {
        return this.config.store.terminal.customColorSchemes.some(x => deepEqual(x, scheme))
    }

    colorsTrackBy (index) {
        return index
    }
}
