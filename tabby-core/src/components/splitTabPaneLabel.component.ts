/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input, HostBinding, ElementRef } from '@angular/core'
import { CdkDragEnd, CdkDragMove, CdkDragStart } from '@angular/cdk/drag-drop'
import { HotkeysService } from '../services/hotkeys.service'
import { AppService } from '../services/app.service'
import { TabTransferService } from '../services/tabTransfer.service'
import { BaseTabComponent } from './baseTab.component'
import { SplitPaneGeometry, SplitTabComponent } from './splitTab.component'
import { SelfPositioningComponent } from './selfPositioning.component'

/** @hidden */
@Component({
    selector: 'split-tab-pane-label',
    template: `
    <div *ngIf='tab.customTitle && tab.customTitleVisible' class='custom-name'>{{tab.customTitle}}</div>
    <div class='rearrange-overlay'>
        <div
            class='rearrange-label'
            cdkDrag
            [cdkDragData]='tab'
            (cdkDragStarted)='onTabDragStart(tab, $event)'
            (cdkDragMoved)='onTabDragMove($event)'
            (cdkDragEnded)='onTabDragEnd($event)'
        >
            <i class="fa fa-window-maximize me-3"></i>
            <label>{{tab.displayTitle}}</label>
        </div>
    </div>
    `,
    styleUrls: ['./splitTabPaneLabel.component.scss'],
})
export class SplitTabPaneLabelComponent extends SelfPositioningComponent {
    @Input() tab: BaseTabComponent
    @Input() parent: SplitTabComponent
    @Input() geometry: SplitPaneGeometry|null
    @HostBinding('class.active') isActive = false
    @HostBinding('class.positioned') isPositioned = false
    @HostBinding('class.minimized') get isMinimized (): boolean {
        return !!this.parent.getMaximizedTab() && this.parent.getMaximizedTab() !== this.tab
    }

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (
        element: ElementRef,
        hotkeys: HotkeysService,
        private app: AppService,
        private tabTransfer: TabTransferService,
    ) {
        super(element)
        this.subscribeUntilDestroyed(hotkeys.hotkey$, hk => {
            if (hk === 'rearrange-panes' && this.parent.hasFocus) {
                this.isActive = true
                this.layout()
            }
        })
        this.subscribeUntilDestroyed(hotkeys.hotkeyOff$, hk => {
            if (hk === 'rearrange-panes') {
                this.isActive = false
            }
        })
    }

    ngOnChanges () {
        this.layout()
    }

    onTabDragStart (tab: BaseTabComponent, event: CdkDragStart): void {
        this.app.emitTabDragStarted(tab)
        this.tabTransfer.handleDragStart(tab, event)
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

    layout () {
        if (!this.geometry) {
            this.isPositioned = false
            return
        }

        this.setDimensions(
            this.geometry.x,
            this.geometry.y,
            this.geometry.w,
            this.geometry.h,
        )
        this.isPositioned = true
    }
}
