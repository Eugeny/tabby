/*
    This plugin is based on Hyperterm Hyperlinks:
    https://github.com/zeit/hyperlinks/blob/master/index.js
*/

import { NgModule } from '@angular/core'
import { TerminalDecorator } from 'terminus-terminal'

import { LinkHandler } from './api'
import { FileHandler, URLHandler } from './handlers'
import { LinkHighlighterDecorator } from './decorator'

@NgModule({
    providers: [
        { provide: LinkHandler, useClass: FileHandler, multi: true },
        { provide: LinkHandler, useClass: URLHandler, multi: true },
        { provide: TerminalDecorator, useClass: LinkHighlighterDecorator, multi: true },
    ],
})
export default class LinkHighlighterModule { }

export * from './api'
