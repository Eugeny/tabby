import { Component, Input, ViewContainerRef, ViewChild, HostBinding, ComponentFactoryResolver, ComponentRef } from '@angular/core'
import { Tab } from 'api/tab'
import { BaseTabComponent } from 'components/baseTab'

@Component({
  selector: 'tab-body',
  template: '<template #placeholder></template>',
  styles: [require('./tabBody.scss')],
})
export class TabBodyComponent {
    @Input() @HostBinding('class.active') active: boolean
    @Input() model: Tab
    @ViewChild('placeholder', {read: ViewContainerRef}) placeholder: ViewContainerRef
    private component: ComponentRef<BaseTabComponent<Tab>>

    constructor (private componentFactoryResolver: ComponentFactoryResolver) {
    }

    ngAfterViewInit () {
        // run after the change detection finishes
        setImmediate(() => {
            let componentFactory = this.componentFactoryResolver.resolveComponentFactory(this.model.getComponentType())
            this.component = this.placeholder.createComponent(componentFactory)
            setImmediate(() => {
                this.component.instance.initModel(this.model)
            })
        })
    }
}
