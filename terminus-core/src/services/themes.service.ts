import { Inject, Injectable } from '@angular/core'
import { ConfigService } from '../services/config.service'
import { Theme } from '../api/theme'

@Injectable({ providedIn: 'root' })
export class ThemesService {
    private styleElement: HTMLElement = null

    /** @hidden */
    constructor (
        private config: ConfigService,
        @Inject(Theme) private themes: Theme[],
    ) {
        this.applyCurrentTheme()
        config.changed$.subscribe(() => {
            this.applyCurrentTheme()
        })
    }

    findTheme (name: string): Theme {
        return this.config.enabledServices(this.themes).find(x => x.name === name)
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
        document.querySelector('style#custom-css').innerHTML = this.config.store.appearance.css
    }

    private applyCurrentTheme (): void {
        this.applyTheme(this.findCurrentTheme())
    }
}
