import { Component, Input, ViewChild, HostBinding, ViewContainerRef, OnChanges } from '@angular/core'
import { BaseTabComponent } from '../components/baseTab.component'

/** @hidden */
@Component({
    selector: 'tab-body',
    template: `
        <!--perfect-scrollbar [config]="{ suppressScrollX: true }" *ngIf="scrollable">
            <ng-template #scrollablePlaceholder></ng-template>
        </perfect-scrollbar-->
        <ng-template #placeholder></ng-template>
    `,
    styleUrls: [
        './tabBody.component.scss',
        './tabBody.deep.component.css',
    ],
})
export class TabBodyComponent implements OnChanges {
    @Input() @HostBinding('class.active') active: boolean
    @Input() tab: BaseTabComponent
    @ViewChild('placeholder', { read: ViewContainerRef }) placeholder: ViewContainerRef

    ngOnChanges (changes) {
        if (changes.tab) {
            if (this.placeholder) {
                this.placeholder.detach()
            }
            setImmediate(() => {
                this.placeholder.insert(this.tab.hostView)
            })
        }
    }

    ngOnDestroy () {
        this.placeholder.detach()
    }
}
