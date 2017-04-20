import { Inject, Injectable } from '@angular/core'
import { ConfigService } from '../services/config.service'
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

    findCurrentTheme (): Theme {
        return this.findTheme(this.config.store.appearance.theme) || this.findTheme('Standard')
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
        this.applyTheme(this.findCurrentTheme())
    }
}
