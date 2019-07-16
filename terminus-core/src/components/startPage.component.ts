import { Component, Inject } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { ConfigService } from '../services/config.service'
import { HomeBaseService } from '../services/homeBase.service'
import { ToolbarButton, ToolbarButtonProvider } from '../api'

/** @hidden */
@Component({
    selector: 'start-page',
    template: require('./startPage.component.pug'),
    styles: [require('./startPage.component.scss')],
})
export class StartPageComponent {
    version: string

    constructor (
        private config: ConfigService,
        private domSanitizer: DomSanitizer,
        public homeBase: HomeBaseService,
        @Inject(ToolbarButtonProvider) private toolbarButtonProviders: ToolbarButtonProvider[],
    ) {
    }

    getButtons (): ToolbarButton[] {
        return this.config.enabledServices(this.toolbarButtonProviders)
            .map(provider => provider.provide())
            .reduce((a, b) => a.concat(b))
            .filter(x => !!x.click)
            .sort((a: ToolbarButton, b: ToolbarButton) => (a.weight || 0) - (b.weight || 0))
    }

    sanitizeIcon (icon: string): any {
        return this.domSanitizer.bypassSecurityTrustHtml(icon || '')
    }
}
