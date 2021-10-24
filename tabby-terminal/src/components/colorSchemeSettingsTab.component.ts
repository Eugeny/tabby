/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import deepEqual from 'deep-equal'

import { Component, Inject, Input, ChangeDetectionStrategy, ChangeDetectorRef, HostBinding } from '@angular/core'
import { ConfigService, PlatformService } from 'tabby-core'
import { TerminalColorSchemeProvider } from '../api/colorSchemeProvider'
import { TerminalColorScheme } from '../api/interfaces'

/** @hidden */
@Component({
    template: require('./colorSchemeSettingsTab.component.pug'),
    styles: [require('./colorSchemeSettingsTab.component.scss')],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorSchemeSettingsTabComponent {
    @Input() stockColorSchemes: TerminalColorScheme[] = []
    @Input() customColorSchemes: TerminalColorScheme[] = []
    @Input() allColorSchemes: TerminalColorScheme[] = []
    @Input() filter = ''
    @Input() editing = false
    colorIndexes = [...new Array(16).keys()]

    currentStockScheme: TerminalColorScheme|null = null
    currentCustomScheme: TerminalColorScheme|null = null

    @HostBinding('class.content-box') true

    constructor (
        @Inject(TerminalColorSchemeProvider) private colorSchemeProviders: TerminalColorSchemeProvider[],
        private changeDetector: ChangeDetectorRef,
        private platform: PlatformService,
        public config: ConfigService,
    ) { }

    async ngOnInit () {
        this.stockColorSchemes = (await Promise.all(this.config.enabledServices(this.colorSchemeProviders).map(x => x.getSchemes()))).reduce((a, b) => a.concat(b))
        this.stockColorSchemes.sort((a, b) => a.name.localeCompare(b.name))
        this.customColorSchemes = this.config.store.terminal.customColorSchemes
        this.changeDetector.markForCheck()

        this.update()
    }

    ngOnChanges () {
        this.update()
    }

    selectScheme (scheme: TerminalColorScheme) {
        this.config.store.terminal.colorScheme = { ...scheme }
        this.config.save()
        this.cancelEditing()
        this.update()
    }

    update () {
        this.currentCustomScheme = this.findMatchingScheme(this.config.store.terminal.colorScheme, this.customColorSchemes)
        this.currentStockScheme = this.findMatchingScheme(this.config.store.terminal.colorScheme, this.stockColorSchemes)
        this.allColorSchemes = this.customColorSchemes.concat(this.stockColorSchemes)
        this.changeDetector.markForCheck()
    }

    editScheme () {
        this.editing = true
    }

    saveScheme () {
        this.customColorSchemes = this.customColorSchemes.filter(x => x.name !== this.config.store.terminal.colorScheme.name)
        this.customColorSchemes.push(this.config.store.terminal.colorScheme)
        this.config.store.terminal.customColorSchemes = this.customColorSchemes
        this.config.save()
        this.cancelEditing()
        this.update()
    }

    cancelEditing () {
        this.editing = false
    }

    async deleteScheme (scheme: TerminalColorScheme) {
        if ((await this.platform.showMessageBox(
            {
                type: 'warning',
                message: `Delete "${scheme.name}"?`,
                buttons: ['Delete', 'Keep'],
                defaultId: 1,
                cancelId: 1,
            }
        )).response === 0) {
            this.customColorSchemes = this.customColorSchemes.filter(x => x.name !== scheme.name)
            this.config.store.terminal.customColorSchemes = this.customColorSchemes
            this.config.save()
            this.update()
        }
    }

    getCurrentSchemeName () {
        return (this.currentCustomScheme ?? this.currentStockScheme)?.name ?? 'Custom'
    }

    findMatchingScheme (scheme: TerminalColorScheme, schemes: TerminalColorScheme[]) {
        return schemes.find(x => deepEqual(x, scheme)) ?? null
    }

    colorsTrackBy (index) {
        return index
    }
}
