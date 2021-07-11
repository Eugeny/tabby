/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, AppService } from 'tabby-core'
import { DemoTerminalTabComponent } from './components/terminalTab.component'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private app: AppService,
    ) {
        super()
        this.app.ready$.subscribe(() => {
            this.app.openNewTab({ type: DemoTerminalTabComponent })
        })
    }

    provide (): ToolbarButton[] {
        return [
            {
                icon: require('./icons/plus.svg'),
                title: 'New demo terminal',
                click: () => {
                    this.app.openNewTab({ type: DemoTerminalTabComponent })
                },
            },
        ]
    }
}
