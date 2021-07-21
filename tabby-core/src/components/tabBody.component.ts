/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Input, ViewChild, HostBinding, ViewContainerRef, OnChanges } from '@angular/core'
import { BaseTabComponent } from '../components/baseTab.component'

/** @hidden */
@Component({
    selector: 'tab-body',
    template: `
        <ng-template #placeholder></ng-template>
    `,
    styles: [
        require('./tabBody.component.scss'),
        require('./tabBody.deep.component.css'),
    ],
})
export class TabBodyComponent implements OnChanges {
    @Input() @HostBinding('class.active') active: boolean
    @Input() tab: BaseTabComponent
    @ViewChild('placeholder', { read: ViewContainerRef }) placeholder?: ViewContainerRef

    ngOnChanges (changes) {
        if (changes.tab) {
            this.placeholder?.detach()
            setImmediate(() => {
                this.placeholder?.insert(this.tab.hostView)
            })
        }
    }

    detach () {
        this.placeholder?.detach()
    }

    ngOnDestroy () {
        this.placeholder?.detach()
    }
}
