import { Inject, Injectable } from '@angular/core'
import { Subject, Observable } from 'rxjs'
import { ConfigService } from '../services/config.service'
import { Theme } from '../api/theme'

@Injectable({ providedIn: 'root' })
export class ThemesService {
    get themeChanged$ (): Observable<Theme> { return this.themeChanged }
    private themeChanged = new Subject<Theme>()

    private styleElement: HTMLElement|null = null

    /** @hidden */
    private constructor (
        private config: ConfigService,
        @Inject(Theme) private themes: Theme[],
    ) {
        this.applyTheme(this.findTheme('Standard')!)
        config.ready$.toPromise().then(() => {
            this.applyCurrentTheme()
            config.changed$.subscribe(() => {
                this.applyCurrentTheme()
            })
        })
    }

    findTheme (name: string): Theme|null {
        return this.config.enabledServices(this.themes).find(x => x.name === name) ?? null
    }

    findCurrentTheme (): Theme {
        return this.findTheme(this.config.store.appearance.theme) ?? this.findTheme('Standard')!
    }

    applyTheme (theme: Theme): void {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style')
            this.styleElement.setAttribute('id', 'theme')
            document.querySelector('head')!.appendChild(this.styleElement)
        }
        this.styleElement.textContent = theme.css
        document.querySelector('style#custom-css')!.innerHTML = this.config.store?.appearance?.css
        this.themeChanged.next(theme)
    }

    private applyCurrentTheme (): void {
        this.applyTheme(this.findCurrentTheme())
    }
}
