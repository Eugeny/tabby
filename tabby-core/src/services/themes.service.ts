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
            this.applyThemeVariables()
            config.changed$.subscribe(() => {
                this.applyCurrentTheme()
            })
        })
        config.changed$.subscribe(() => this.applyThemeVariables())
    }

    private applyThemeVariables () {
        const theme = this.config.store.terminal.colorScheme
        document.documentElement.style.setProperty('--bs-body-bg', this.config.store?.appearance.vibrancy ? 'rgba(255, 255, 255,.4)' : theme.background)
        document.documentElement.style.setProperty('--bs-body-color', theme.foreground)
        document.documentElement.style.setProperty('--bs-black', theme.colors[0])
        document.documentElement.style.setProperty('--bs-blue', theme.colors[1])
        document.documentElement.style.setProperty('--bs-green', theme.colors[2])
        document.documentElement.style.setProperty('--bs-cyan', theme.colors[3])
        document.documentElement.style.setProperty('--bs-red', theme.colors[4])
        document.documentElement.style.setProperty('--bs-purple', theme.colors[5])
        document.documentElement.style.setProperty('--bs-yellow', theme.colors[6])
        document.documentElement.style.setProperty('--bs-gray', theme.colors[7])
        document.documentElement.style.setProperty('--bs-gray-dark', theme.colors[8])
        // document.documentElement.style.setProperty('--bs-blue', theme.colors[9])
        // document.documentElement.style.setProperty('--bs-green', theme.colors[10])
        // document.documentElement.style.setProperty('--bs-cyan', theme.colors[11])
        // document.documentElement.style.setProperty('--bs-red', theme.colors[12])
        // document.documentElement.style.setProperty('--bs-purple', theme.colors[13])
        // document.documentElement.style.setProperty('--bs-yellow', theme.colors[14])
        document.documentElement.style.setProperty('--bs-white', theme.colors[15])
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
