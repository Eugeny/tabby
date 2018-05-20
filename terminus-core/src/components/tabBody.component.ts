import { Component, Input, ViewChild, HostBinding, ViewContainerRef } from '@angular/core'
import { BaseTabComponent } from '../components/baseTab.component'

@Component({
    selector: 'tab-body',
    template: `
        <perfect-scrollbar [config]="{ suppressScrollX: true }" *ngIf="scrollable">
            <ng-template #scrollablePlaceholder></ng-template>
        </perfect-scrollbar>
        <ng-template #nonScrollablePlaceholder *ngIf="!scrollable"></ng-template>
    `,
    styles: [
        require('./tabBody.component.scss'),
        require('./tabBody.deep.component.css'),
    ],
})
export class TabBodyComponent {
    @Input() @HostBinding('class.active') active: boolean
    @Input() tab: BaseTabComponent
    @Input() scrollable: boolean
    @ViewChild('scrollablePlaceholder', {read: ViewContainerRef}) scrollablePlaceholder: ViewContainerRef
    @ViewChild('nonScrollablePlaceholder', {read: ViewContainerRef}) nonScrollablePlaceholder: ViewContainerRef

    ngAfterViewInit () {
        setImmediate(() => {
            (this.scrollable ? this.scrollablePlaceholder : this.nonScrollablePlaceholder).insert(this.tab.hostView)
        })
    }
}
