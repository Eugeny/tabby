import { Component, Input, ChangeDetectionStrategy } from '@angular/core'
import { ConfigService, getCSSFontFamily } from 'terminus-core'
import { TerminalColorScheme } from '../api/interfaces'

/** @hidden */
@Component({
    selector: 'color-scheme-preview',
    template: require('./colorSchemePreview.component.pug'),
    styles: [require('./colorSchemePreview.component.scss')],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorSchemePreviewComponent {
    @Input() scheme: TerminalColorScheme
    @Input() fontPreview = false

    constructor (public config: ConfigService) {}

    getPreviewFontFamily (): string {
        return getCSSFontFamily(this.config.store)
    }
}
