/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Observable } from 'rxjs'
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators'
import { exec } from 'mz/child_process'
import deepEqual from 'deep-equal'
const fontManager = require('fontmanager-redux') // eslint-disable-line

import { Component, Inject } from '@angular/core'
import { ConfigService, HostAppService, Platform, ElectronService, getCSSFontFamily } from 'terminus-core'
import { TerminalColorSchemeProvider } from '../api/colorSchemeProvider'
import { TerminalColorScheme } from '../api/interfaces'

/** @hidden */
@Component({
    template: require('./appearanceSettingsTab.component.pug'),
    styles: [require('./appearanceSettingsTab.component.scss')],
})
export class AppearanceSettingsTabComponent {
    fonts: string[] = []
    colorSchemes: TerminalColorScheme[] = []
    equalComparator = deepEqual
    editingColorScheme: TerminalColorScheme|null = null
    schemeChanged = false

    constructor (
        @Inject(TerminalColorSchemeProvider) private colorSchemeProviders: TerminalColorSchemeProvider[],
        private hostApp: HostAppService,
        private electron: ElectronService,
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

    editScheme (scheme: TerminalColorScheme) {
        this.editingColorScheme = scheme
        this.schemeChanged = false
    }

    saveScheme () {
        let schemes = this.config.store.terminal.customColorSchemes
        schemes = schemes.filter(x => x !== this.editingColorScheme && x.name !== this.editingColorScheme!.name)
        schemes.push(this.editingColorScheme)
        this.config.store.terminal.customColorSchemes = schemes
        this.config.save()
        this.cancelEditing()
    }

    cancelEditing () {
        this.editingColorScheme = null
    }

    async deleteScheme (scheme: TerminalColorScheme) {
        if ((await this.electron.showMessageBox(
            this.hostApp.getWindow(),
            {
                type: 'warning',
                message: `Delete "${scheme.name}"?`,
                buttons: ['Keep', 'Delete'],
                defaultId: 1,
            }
        )).response === 1) {
            let schemes = this.config.store.terminal.customColorSchemes
            schemes = schemes.filter(x => x !== scheme)
            this.config.store.terminal.customColorSchemes = schemes
            this.config.save()
        }
    }

    isCustomScheme (scheme: TerminalColorScheme) {
        return this.config.store.terminal.customColorSchemes.some(x => deepEqual(x, scheme))
    }

    colorsTrackBy (index) {
        return index
    }

    getPreviewFontFamily () {
        return getCSSFontFamily(this.config.store)
    }
}
