import { Injectable } from '@angular/core'
import { TerminalColorSchemeProvider, TerminalColorScheme } from 'terminus-terminal'

const schemeContents = require.context('../schemes/', true, /.*/)

@Injectable()
export class ColorSchemes extends TerminalColorSchemeProvider {
    async getSchemes (): Promise<TerminalColorScheme[]> {
        const schemes: TerminalColorScheme[] = []

        schemeContents.keys().forEach(schemeFile => {
            const lines = (schemeContents(schemeFile).default as string).split('\n')

            // process #define variables
            const variables: any = {}
            lines
                .filter(x => x.startsWith('#define'))
                .map(x => x.split(' ').map(v => v.trim()))
                .forEach(([_, variableName, variableValue]) => {
                    variables[variableName] = variableValue
                })

            const values: any = {}
            lines
                .filter(x => x.startsWith('*.'))
                .map(x => x.substring(2))
                .map(x => x.split(':').map(v => v.trim()))
                .forEach(([key, value]) => {
                    values[key] = variables[value] ? variables[value] : value
                })

            const colors: string[] = []
            let colorIndex = 0
            while (values[`color${colorIndex}`]) {
                colors.push(values[`color${colorIndex}`])
                colorIndex++
            }

            schemes.push({
                name: schemeFile.split('/')[1].trim(),
                foreground: values.foreground,
                background: values.background,
                cursor: values.cursorColor,
                colors,
            })
        })

        return schemes
    }
}
