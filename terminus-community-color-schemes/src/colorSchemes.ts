import { Injectable } from '@angular/core'
import { TerminalColorSchemeProvider, ITerminalColorScheme } from 'terminus-terminal'

const schemeContents = require.context('../schemes/', true, /.*/)


@Injectable()
export class ColorSchemes extends TerminalColorSchemeProvider {
    async getSchemes (): Promise<ITerminalColorScheme[]> {
        let schemes: ITerminalColorScheme[] = []

        schemeContents.keys().forEach(schemeFile => {
            let lines = (<string>schemeContents(schemeFile)).split('\n')
            let values: any = {}
            lines
                .filter(x => x.startsWith('*.'))
                .map(x => x.substring(2))
                .map(x => x.split(':').map(v => v.trim()))
                .forEach(([key, value]) => {
                    values[key] = value
                })

            schemes.push({
                name: schemeFile.split('/')[1].trim(),
                foreground: values.foreground,
                background: values.background,
                cursor: values.cursorColor,
                colors: [
                    values.color0,
                    values.color1,
                    values.color2,
                    values.color3,
                    values.color4,
                    values.color5,
                    values.color6,
                    values.color7,
                    values.color8,
                    values.color9,
                    values.color10,
                    values.color11,
                    values.color12,
                    values.color13,
                    values.color14,
                    values.color15,
                ],
            })
        })

        return schemes
    }
}
