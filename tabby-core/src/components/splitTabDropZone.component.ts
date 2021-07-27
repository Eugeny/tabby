/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input, HostBinding, ElementRef, Output, EventEmitter } from '@angular/core'
import { AppService } from '../services/app.service'
import { BaseTabComponent } from './baseTab.component'
import { SelfPositioningComponent } from './selfPositioning.component'
import { SplitDropZoneInfo } from './splitTab.component'

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
    styles: [require('./splitTabDropZone.component.scss')],
})
export class SplitTabDropZoneComponent extends SelfPositioningComponent {
    @Input() dropZone: SplitDropZoneInfo
    @Input() parent: BaseTabComponent
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
            this.isActive = !!tab && tab !== this.parent
            this.layout()
        })
    }

    ngOnChanges () {
        this.layout()
    }

    layout () {
        const tabElement: HTMLElement|undefined = this.dropZone.relativeToTab.viewContainerEmbeddedRef?.rootNodes[0]

        if (!tabElement) {
            // being destroyed
            return
        }

        const args = {
            t: [0, 0, tabElement.clientWidth, tabElement.clientHeight / 5],
            l: [0, tabElement.clientHeight / 5, tabElement.clientWidth / 3, tabElement.clientHeight * 3 / 5],
            r: [tabElement.clientWidth * 2 / 3, tabElement.clientHeight / 5, tabElement.clientWidth / 3, tabElement.clientHeight * 3 / 5],
            b: [0, tabElement.clientHeight * 4 / 5, tabElement.clientWidth, tabElement.clientHeight / 5],
        }[this.dropZone.side]

        this.setDimensions(
            args[0] + tabElement.offsetLeft,
            args[1] + tabElement.offsetTop,
            args[2],
            args[3],
            'px'
        )
    }
}
