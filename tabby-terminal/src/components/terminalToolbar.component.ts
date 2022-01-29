/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, HostListener, Input } from '@angular/core'
import { BaseTerminalTabComponent } from '../api/baseTerminalTab.component'

/** @hidden */
@Component({
    selector: 'terminal-toolbar',
    template: require('./terminalToolbar.component.pug'),
    styles: [require('./terminalToolbar.component.scss')],
})
export class TerminalToolbarComponent {
    @Input() tab: BaseTerminalTabComponent

    @HostListener('mouseenter') onMouseEnter () {
        this.tab.showToolbar()
    }

    @HostListener('mouseleave') onMouseLeave () {
        this.tab.hideToolbar()
    }
}
