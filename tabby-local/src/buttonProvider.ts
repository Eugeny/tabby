/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, TranslateService } from 'tabby-core'
import { TerminalService } from './services/terminal.service'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private terminal: TerminalService,
        private translate: TranslateService,
    ) {
        super()
    }

    provide (): ToolbarButton[] {
        return [
            {
                icon: require('./icons/plus.svg'),
                title: this.translate.instant('New terminal'),
                touchBarNSImage: 'NSTouchBarAddDetailTemplate',
                click: () => {
                    this.terminal.openTab()
                },
            },
        ]
    }
}
