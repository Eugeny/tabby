/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input, HostBinding, ElementRef, Output, EventEmitter } from '@angular/core'
import { AppService } from '../services/app.service'
import { BaseTabComponent } from './baseTab.component'
import { SelfPositioningComponent } from './selfPositioning.component'
import { SplitDropZoneInfo, SplitTabComponent } from './splitTab.component'

/** @hidden */
@Component({
    selector: 'split-tab-drop-zone',
    template: `
    <div
        cdkDropList
        (cdkDropListDropped)="tabDropped.emit($event.item.data); isHighlighted = false"
        (cdkDropListEntered)="isHighlighted = true"
        (cdkDropListExited)="isHighlighted = false"
        cdkAutoDropGroup='app-tabs'
    >
    </div>
    `,
    styleUrls: ['./splitTabDropZone.component.scss'],
})
export class SplitTabDropZoneComponent extends SelfPositioningComponent {
    @Input() dropZone: SplitDropZoneInfo
    @Input() parent: SplitTabComponent
    @Output() tabDropped = new EventEmitter<BaseTabComponent>()
    @HostBinding('class.active') isActive = false
    @HostBinding('class.highlighted') isHighlighted = false

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor (
        element: ElementRef,
        app: AppService,
    ) {
        super(element)
        this.subscribeUntilDestroyed(app.tabDragActive$, tab => {
            this.isActive = !!tab && this.canActivateFor(tab)
            this.layout()
        })
    }

    canActivateFor (tab: BaseTabComponent): boolean {
        const allTabs = this.parent.getAllTabs()
        return !(
            tab === this.parent ||
            allTabs.length === 1 && allTabs.includes(tab) ||
            this.dropZone.type === 'relative' && tab === this.dropZone.relativeTo ||
            this.dropZone.type === 'absolute' && tab === this.dropZone.container.children[this.dropZone.position]
        )
    }

    ngOnChanges () {
        this.layout()
    }

    layout () {
        this.setDimensions(
            this.dropZone.x,
            this.dropZone.y,
            this.dropZone.w,
            this.dropZone.h,
        )
    }
}
