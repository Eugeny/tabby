/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input, HostBinding, ElementRef } from '@angular/core'
import { HotkeysService } from '../services/hotkeys.service'
import { AppService } from '../services/app.service'
import { BaseTabComponent } from './baseTab.component'
import { SelfPositioningComponent } from './selfPositioning.component'

/** @hidden */
@Component({
    selector: 'split-tab-pane-label',
    template: `
    <div
        cdkDrag
        [cdkDragData]='tab'
        (cdkDragStarted)='onTabDragStart(tab)'
        (cdkDragEnded)='onTabDragEnd()'
    >
        <i class="fa fa-window-maximize mr-3"></i>
        <label>{{tab.title}}</label>
    </div>
    `,
    styles: [require('./splitTabPaneLabel.component.scss')],
})
export class SplitTabPaneLabelComponent extends SelfPositioningComponent {
    @Input() tab: BaseTabComponent
    @Input() parent: BaseTabComponent
    @HostBinding('class.active') isActive = false

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (
        element: ElementRef,
        hotkeys: HotkeysService,
        private app: AppService,
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

    onTabDragStart (tab: BaseTabComponent): void {
        this.app.emitTabDragStarted(tab)
    }

    onTabDragEnd (): void {
        setTimeout(() => {
            this.app.emitTabDragEnded()
            this.app.emitTabsChanged()
        })
    }

    layout () {
        const tabElement: HTMLElement|undefined = this.tab.viewContainerEmbeddedRef?.rootNodes[0]

        if (!tabElement) {
            // being destroyed
            return
        }

        this.setDimensions(
            tabElement.offsetLeft,
            tabElement.offsetTop,
            tabElement.clientWidth,
            tabElement.clientHeight,
            'px'
        )
    }
}
