import { Inject, Injectable } from '@angular/core'
import { ConfigService } from '../services/config'
import { Theme } from '../api/theme'


@Injectable()
export class ThemesService {
    private styleElement: HTMLElement = null

    constructor (
        private config: ConfigService,
        @Inject(Theme) private themes: Theme[],
    ) {
        this.applyCurrentTheme()
        config.change.subscribe(() => {
            this.applyCurrentTheme()
        })
    }

    findTheme (name: string): Theme {
        return this.themes.find(x => x.name === name)
    }

    applyTheme (theme: Theme): void {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style')
            this.styleElement.setAttribute('id', 'theme')
            document.querySelector('head').appendChild(this.styleElement)
        }
        this.styleElement.textContent = theme.css
    }

    applyCurrentTheme (): void {
        let theme = this.findTheme(this.config.store.appearance.theme)
        if (!theme) {
            theme = this.findTheme('Standard')
        }
        this.applyTheme(theme)
    }
}
