/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'

import { Component, Inject, Input, ChangeDetectionStrategy, ChangeDetectorRef, HostBinding, Output, EventEmitter } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { TerminalColorSchemeProvider } from '../api/colorSchemeProvider'
import { TerminalColorScheme } from '../api/interfaces'

_('Search color schemes')

/** @hidden */
@Component({
    selector: 'color-scheme-selector',
    template: require('./colorSchemeSelector.component.pug'),
    styles: [`
        :host {
            display: block;
            max-height: 100vh;
            overflow-y: auto;
        }
    `],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorSchemeSelectorComponent {
    allColorSchemes: TerminalColorScheme[] = []
    filter = ''

    @Input() model: TerminalColorScheme|null = null
    @Output() modelChange = new EventEmitter<TerminalColorScheme|null>()

    @HostBinding('class.content-box') true

    constructor (
        @Inject(TerminalColorSchemeProvider) private colorSchemeProviders: TerminalColorSchemeProvider[],
        private changeDetector: ChangeDetectorRef,
        public config: ConfigService,
    ) { }

    async ngOnInit () {
        const stockColorSchemes = (await Promise.all(this.config.enabledServices(this.colorSchemeProviders).map(x => x.getSchemes()))).reduce((a, b) => a.concat(b))
        stockColorSchemes.sort((a, b) => a.name.localeCompare(b.name))
        const customColorSchemes = this.config.store.terminal.customColorSchemes

        this.allColorSchemes = customColorSchemes.concat(stockColorSchemes)
        this.changeDetector.markForCheck()
    }

    selectScheme (scheme: TerminalColorScheme) {
        this.model = scheme
        this.modelChange.emit(scheme)
        this.changeDetector.markForCheck()
    }
}
