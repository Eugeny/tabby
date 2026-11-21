/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, HostListener, Input } from '@angular/core'
import { CdkDragEnd, CdkDragMove, CdkDragStart } from '@angular/cdk/drag-drop'
import { AppService, SplitTabComponent, TabTransferService } from 'tabby-core'
import { BaseTerminalTabComponent } from '../api/baseTerminalTab.component'

/** @hidden */
@Component({
    selector: 'terminal-toolbar',
    templateUrl: './terminalToolbar.component.pug',
    styleUrls: ['./terminalToolbar.component.scss'],
})
export class TerminalToolbarComponent {
    @Input() tab: BaseTerminalTabComponent<any>

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (
        private app: AppService,
        private tabTransfer: TabTransferService,
    ) { }

    onTabDragStart (event: CdkDragStart): void {
        this.app.emitTabDragStarted(this.tab)
        this.tabTransfer.handleDragStart(this.tab, event)
    }

    onTabDragMove (event: CdkDragMove): void {
        this.tabTransfer.handleDragMove(this.tab, event)
    }

    onTabDragEnd (event: CdkDragEnd): void {
        setTimeout(() => {
            this.app.emitTabDragEnded()
            this.app.emitTabsChanged()
        })
        this.tabTransfer.handleDragEnd(this.tab, event)
    }

    get shouldShowDragHandle (): boolean {
        return this.tab.topmostParent instanceof SplitTabComponent && this.tab.topmostParent.getAllTabs().length > 1
    }

    @HostListener('mouseenter') onMouseEnter () {
        this.tab.showToolbar()
    }

    @HostListener('mouseleave') onMouseLeave () {
        this.tab.hideToolbar()
    }
}
