/* eslint-disable @typescript-eslint/no-extraneous-class */
import { NgModule } from '@angular/core'
import { ToastrModule } from 'ngx-toastr'
import { ConfigProvider } from 'tabby-core'
import { TerminalDecorator } from 'tabby-terminal'

import { LinkHandler } from './api'
import { UnixFileHandler, WindowsFileHandler, URLHandler, IPHandler } from './handlers'
import { LinkHighlighterDecorator } from './decorator'
import { ClickableLinksConfigProvider } from './config'

@NgModule({
    imports: [
        ToastrModule,
    ],
    providers: [
        { provide: LinkHandler, useClass: URLHandler, multi: true },
        { provide: LinkHandler, useClass: IPHandler, multi: true },
        { provide: LinkHandler, useClass: UnixFileHandler, multi: true },
        { provide: LinkHandler, useClass: WindowsFileHandler, multi: true },
        { provide: TerminalDecorator, useClass: LinkHighlighterDecorator, multi: true },
        { provide: ConfigProvider, useClass: ClickableLinksConfigProvider, multi: true },
    ],
})
export default class LinkifierModule { }

export * from './api'
