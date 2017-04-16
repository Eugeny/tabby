import { Component, Input, ViewChild, HostBinding, ViewContainerRef } from '@angular/core'
import { BaseTabComponent } from '../components/baseTab'

@Component({
    selector: 'tab-body',
    template: `
        <perfect-scrollbar [config]="{ suppressScrollX: true, suppressScrollY: !scrollable}">
            <ng-template #placeholder></ng-template>
        </perfect-scrollbar>
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
    @ViewChild('placeholder', {read: ViewContainerRef}) placeholder: ViewContainerRef

    ngAfterViewInit () {
        setImmediate(() => {
            this.placeholder.insert(this.tab.hostView)
        })
    }
}
