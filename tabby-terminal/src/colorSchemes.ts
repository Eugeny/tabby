import { Injectable } from '@angular/core'
import { TerminalColorScheme } from './api/interfaces'
import { TerminalColorSchemeProvider } from './api/colorSchemeProvider'

@Injectable({ providedIn: 'root' })
export class DefaultColorSchemes extends TerminalColorSchemeProvider {
    static defaultColorScheme: TerminalColorScheme = {
        name: 'Tabby Default',
        foreground: '#cacaca',
        background: '#171717',
        cursor: '#bbbbbb',
        colors: [
            '#000000',
            '#ff615a',
            '#b1e969',
            '#ebd99c',
            '#5da9f6',
            '#e86aff',
            '#82fff7',
            '#dedacf',
            '#313131',
            '#f58c80',
            '#ddf88f',
            '#eee5b2',
            '#a5c7ff',
            '#ddaaff',
            '#b7fff9',
            '#ffffff',
        ],
    }

    async getSchemes (): Promise<TerminalColorScheme[]> {
        return [DefaultColorSchemes.defaultColorScheme]
    }
}
