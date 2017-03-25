import { NgModule } from '@angular/core'

import { LinkHandler } from './api'
import { FileHandler, URLHandler } from './handlers'
import { TerminalDecorator } from '../terminal/api'
import { LinkHighlighterDecorator } from './decorator'


@NgModule({
    providers: [
        { provide: LinkHandler, useClass: FileHandler, multi: true },
        { provide: LinkHandler, useClass: URLHandler, multi: true },
        { provide: TerminalDecorator, useClass: LinkHighlighterDecorator, multi: true },
    ],
})
class LinkHighlighterModule {
}


export default LinkHighlighterModule
