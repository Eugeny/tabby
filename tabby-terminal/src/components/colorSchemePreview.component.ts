import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core'
import { BaseComponent, ConfigService, getCSSFontFamily } from 'tabby-core'
import { TerminalColorScheme } from '../api/interfaces'

/** @hidden */
@Component({
    selector: 'color-scheme-preview',
    template: require('./colorSchemePreview.component.pug'),
    styles: [require('./colorSchemePreview.component.scss')],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorSchemePreviewComponent extends BaseComponent {
    @Input() scheme: TerminalColorScheme
    @Input() fontPreview = false

    constructor (
        public config: ConfigService,
        changeDetector: ChangeDetectorRef,
    ) {
        super()
        this.subscribeUntilDestroyed(config.changed$, () => {
            changeDetector.markForCheck()
        })
    }

    getPreviewFontFamily (): string {
        return getCSSFontFamily(this.config.store)
    }
}
