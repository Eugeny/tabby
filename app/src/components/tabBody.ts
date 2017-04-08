import { Component, Input, ViewChild, HostBinding, ViewContainerRef } from '@angular/core'
import { BaseTabComponent } from 'components/baseTab'

@Component({
  selector: 'tab-body',
  template: '<ng-template #placeholder></ng-template>',
  styles: [require('./tabBody.scss')],
})
export class TabBodyComponent {
    @Input() @HostBinding('class.active') active: boolean
    @Input() tab: BaseTabComponent
    @ViewChild('placeholder', {read: ViewContainerRef}) placeholder: ViewContainerRef

    ngAfterViewInit () {
        setImmediate(() => {
            this.placeholder.insert(this.tab.hostView)
        })
    }
}
