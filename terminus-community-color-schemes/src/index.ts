import { NgModule } from '@angular/core'
import { TerminalColorSchemeProvider } from 'terminus-terminal'

import { ColorSchemes } from './colorSchemes'

@NgModule({
    providers: [
        { provide: TerminalColorSchemeProvider, useClass: ColorSchemes, multi: true },
    ],
})
export default class PopularThemesModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
